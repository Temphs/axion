import {
  parseRequestedDocs,
  parseRequestedBookInfo,
  type RequestedDocResult,
  type RequestedBookInfoResult,
  type MyDataDoc,
  type MyDataBookRecord,
} from './xml'
import { normalizeMyDataDoc, type InvoiceDirection, type NormalizedInvoice } from './normalize'

// Thin, typed client for the AADE myDATA REST API (ERP interface, spec v2.0.x).
//
// Endpoints (relative to the environment base URL):
//   GET RequestDocs             — docs issued by *others* that concern the entity (expenses)
//   GET RequestTransmittedDocs  — docs the entity itself transmitted (income)
//   GET RequestMyIncome / RequestMyExpenses — summarized book info rows
//
// Auth is two headers on every call: `aade-user-id` and
// `ocp-apim-subscription-key`. Credentials are provided by the caller
// (see services/aade/credentials.ts) and are never logged or echoed in errors.

export type MyDataEnvironment = 'sandbox' | 'production'

const DEFAULT_BASE_URLS: Record<MyDataEnvironment, string> = {
  sandbox: 'https://mydataapidev.aade.gr/',
  production: 'https://mydatapi.aade.gr/myDATA/',
}

export function myDataBaseUrl(environment: MyDataEnvironment): string {
  const override =
    environment === 'production' ? process.env.AADE_PRODUCTION_BASE_URL : process.env.AADE_SANDBOX_BASE_URL
  const base = override || DEFAULT_BASE_URLS[environment]
  return base.endsWith('/') ? base : `${base}/`
}

export type MyDataCredentials = {
  aadeUserId: string
  subscriptionKey: string
  environment: MyDataEnvironment
}

export type MyDataErrorCode = 'auth_failed' | 'rate_limited' | 'bad_request' | 'upstream_error' | 'network_error'

// Deliberately carries only a machine code + HTTP status: upstream bodies can
// echo request details and must never reach logs or clients verbatim.
export class MyDataApiError extends Error {
  readonly code: MyDataErrorCode
  readonly status?: number

  constructor(code: MyDataErrorCode, status?: number) {
    super(`myDATA request failed (${code}${status ? `, HTTP ${status}` : ''})`)
    this.name = 'MyDataApiError'
    this.code = code
    this.status = status
  }
}

function statusToCode(status: number): MyDataErrorCode {
  if (status === 401 || status === 403) return 'auth_failed'
  if (status === 429) return 'rate_limited'
  if (status >= 500) return 'upstream_error'
  return 'bad_request'
}

function formatAadeDate(date: Date): string {
  const dd = String(date.getUTCDate()).padStart(2, '0')
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0')
  return `${dd}/${mm}/${date.getUTCFullYear()}`
}

export type DocRequestParams = {
  // Cursor: returns docs with MARK strictly greater than this. '0' = from the beginning.
  mark: string
  dateFrom?: Date
  dateTo?: Date
  counterVatNumber?: string
  entityVatNumber?: string
  nextPartitionKey?: string
  nextRowKey?: string
}

export type BookRequestParams = {
  dateFrom: Date
  dateTo: Date
  counterVatNumber?: string
  entityVatNumber?: string
  nextPartitionKey?: string
  nextRowKey?: string
}

type FetchLike = (url: string, init: { headers: Record<string, string> }) => Promise<{
  ok: boolean
  status: number
  text: () => Promise<string>
}>

const MAX_PAGES = 50 // hard stop so a bad continuation token can't loop forever

export class MyDataClient {
  private readonly credentials: MyDataCredentials
  private readonly fetchImpl: FetchLike

  constructor(credentials: MyDataCredentials, fetchImpl?: FetchLike) {
    this.credentials = credentials
    this.fetchImpl = fetchImpl ?? (fetch as unknown as FetchLike)
  }

  private async get(endpoint: string, params: Record<string, string | undefined>): Promise<string> {
    const url = new URL(endpoint, myDataBaseUrl(this.credentials.environment))
    for (const [key, value] of Object.entries(params)) {
      if (value != null && value !== '') url.searchParams.set(key, value)
    }

    let response: Awaited<ReturnType<FetchLike>>
    try {
      response = await this.fetchImpl(url.toString(), {
        headers: {
          'aade-user-id': this.credentials.aadeUserId,
          'ocp-apim-subscription-key': this.credentials.subscriptionKey,
        },
      })
    } catch {
      throw new MyDataApiError('network_error')
    }

    if (!response.ok) throw new MyDataApiError(statusToCode(response.status), response.status)
    return response.text()
  }

  private docParams(params: DocRequestParams): Record<string, string | undefined> {
    return {
      mark: params.mark,
      dateFrom: params.dateFrom ? formatAadeDate(params.dateFrom) : undefined,
      dateTo: params.dateTo ? formatAadeDate(params.dateTo) : undefined,
      counterVatNumber: params.counterVatNumber,
      entityVatNumber: params.entityVatNumber,
      nextPartitionKey: params.nextPartitionKey,
      nextRowKey: params.nextRowKey,
    }
  }

  // Documents issued by other entities that concern us → expense side.
  async requestDocs(params: DocRequestParams): Promise<RequestedDocResult> {
    return parseRequestedDocs(await this.get('RequestDocs', this.docParams(params)))
  }

  // Documents we transmitted ourselves → income side.
  async requestTransmittedDocs(params: DocRequestParams): Promise<RequestedDocResult> {
    return parseRequestedDocs(await this.get('RequestTransmittedDocs', this.docParams(params)))
  }

  private bookParams(params: BookRequestParams): Record<string, string | undefined> {
    return {
      dateFrom: formatAadeDate(params.dateFrom),
      dateTo: formatAadeDate(params.dateTo),
      counterVatNumber: params.counterVatNumber,
      entityVatNumber: params.entityVatNumber,
      nextPartitionKey: params.nextPartitionKey,
      nextRowKey: params.nextRowKey,
    }
  }

  async requestMyIncome(params: BookRequestParams): Promise<RequestedBookInfoResult> {
    return parseRequestedBookInfo(await this.get('RequestMyIncome', this.bookParams(params)))
  }

  async requestMyExpenses(params: BookRequestParams): Promise<RequestedBookInfoResult> {
    return parseRequestedBookInfo(await this.get('RequestMyExpenses', this.bookParams(params)))
  }

  // Follows continuation tokens until exhausted (or MAX_PAGES).
  async requestAllDocs(kind: 'received' | 'transmitted', params: DocRequestParams): Promise<MyDataDoc[]> {
    const docs: MyDataDoc[] = []
    let next: { nextPartitionKey?: string; nextRowKey?: string } = {}
    for (let page = 0; page < MAX_PAGES; page++) {
      const result =
        kind === 'received'
          ? await this.requestDocs({ ...params, ...next })
          : await this.requestTransmittedDocs({ ...params, ...next })
      docs.push(...result.docs)
      if (!result.continuationToken) return docs
      next = result.continuationToken
    }
    return docs
  }

  async requestAllBookInfo(kind: 'income' | 'expenses', params: BookRequestParams): Promise<MyDataBookRecord[]> {
    const records: MyDataBookRecord[] = []
    let next: { nextPartitionKey?: string; nextRowKey?: string } = {}
    for (let page = 0; page < MAX_PAGES; page++) {
      const result =
        kind === 'income'
          ? await this.requestMyIncome({ ...params, ...next })
          : await this.requestMyExpenses({ ...params, ...next })
      records.push(...result.records)
      if (!result.continuationToken) return records
      next = result.continuationToken
    }
    return records
  }
}

// Parses a single raw myDATA XML document (RequestedDoc payload) into docs.
export function parseMyDataInvoice(xml: string): MyDataDoc[] {
  return parseRequestedDocs(xml).docs
}

// Maps a parsed doc into the internal normalized invoice shape.
export function normalizeInvoice(doc: MyDataDoc, direction: InvoiceDirection): NormalizedInvoice | null {
  return normalizeMyDataDoc(doc, direction)
}

export type { NormalizedInvoice, InvoiceDirection } from './normalize'
export type { MyDataDoc, MyDataBookRecord } from './xml'
