import { describe, it, expect } from 'vitest'
import { MyDataClient, MyDataApiError, myDataBaseUrl } from '@/services/aade/mydataClient'

const EMPTY_DOC = '<RequestedDoc></RequestedDoc>'

function pagedResponses(pages: string[]) {
  const calls: string[] = []
  let i = 0
  const fetchImpl = async (url: string) => {
    calls.push(url)
    const body = pages[Math.min(i, pages.length - 1)]
    i++
    return { ok: true, status: 200, text: async () => body }
  }
  return { fetchImpl, calls }
}

const CREDS = { aadeUserId: 'user', subscriptionKey: 'key', environment: 'sandbox' as const }

describe('MyDataClient', () => {
  it('sends the AADE auth headers and mark cursor', async () => {
    let seenHeaders: Record<string, string> = {}
    let seenUrl = ''
    const client = new MyDataClient(CREDS, async (url, init) => {
      seenHeaders = init.headers
      seenUrl = url
      return { ok: true, status: 200, text: async () => EMPTY_DOC }
    })
    await client.requestDocs({ mark: '42', dateFrom: new Date(Date.UTC(2026, 0, 15)) })

    expect(seenHeaders['aade-user-id']).toBe('user')
    expect(seenHeaders['ocp-apim-subscription-key']).toBe('key')
    expect(seenUrl).toContain('RequestDocs')
    expect(seenUrl).toContain('mark=42')
    expect(seenUrl).toContain(encodeURIComponent('15/01/2026'))
  })

  it('follows continuation tokens across pages', async () => {
    const page1 = `<RequestedDoc>
      <continuationToken><nextPartitionKey>P2</nextPartitionKey><nextRowKey>R2</nextRowKey></continuationToken>
      <invoicesDoc><invoice><mark>1</mark><invoiceHeader><issueDate>2026-01-01</issueDate></invoiceHeader>
      <invoiceSummary><totalNetValue>1</totalNetValue><totalVatAmount>0</totalVatAmount><totalGrossValue>1</totalGrossValue></invoiceSummary></invoice></invoicesDoc>
    </RequestedDoc>`
    const page2 = `<RequestedDoc>
      <invoicesDoc><invoice><mark>2</mark><invoiceHeader><issueDate>2026-01-02</issueDate></invoiceHeader>
      <invoiceSummary><totalNetValue>2</totalNetValue><totalVatAmount>0</totalVatAmount><totalGrossValue>2</totalGrossValue></invoiceSummary></invoice></invoicesDoc>
    </RequestedDoc>`
    const { fetchImpl, calls } = pagedResponses([page1, page2])

    const client = new MyDataClient(CREDS, fetchImpl)
    const docs = await client.requestAllDocs('received', { mark: '0' })

    expect(docs.map((d) => d.mark)).toEqual(['1', '2'])
    expect(calls).toHaveLength(2)
    expect(calls[1]).toContain('nextPartitionKey=P2')
    expect(calls[1]).toContain('nextRowKey=R2')
  })

  it('maps HTTP failures to sanitized error codes without leaking credentials', async () => {
    const client = new MyDataClient(CREDS, async () => ({ ok: false, status: 401, text: async () => 'denied' }))
    try {
      await client.requestDocs({ mark: '0' })
      expect.unreachable()
    } catch (e) {
      const err = e as MyDataApiError
      expect(err).toBeInstanceOf(MyDataApiError)
      expect(err.code).toBe('auth_failed')
      expect(err.message).not.toContain('key')
      expect(err.message).not.toContain('user')
    }
  })

  it('maps network failures and rate limits', async () => {
    const boom = new MyDataClient(CREDS, async () => {
      throw new Error('socket hangup: token=key')
    })
    await expect(boom.requestDocs({ mark: '0' })).rejects.toMatchObject({ code: 'network_error' })

    const limited = new MyDataClient(CREDS, async () => ({ ok: false, status: 429, text: async () => '' }))
    await expect(limited.requestMyIncome({ dateFrom: new Date(), dateTo: new Date() })).rejects.toMatchObject({
      code: 'rate_limited',
    })
  })

  it('resolves sandbox and production base urls', () => {
    expect(myDataBaseUrl('sandbox')).toContain('mydataapidev.aade.gr')
    expect(myDataBaseUrl('production')).toContain('mydatapi.aade.gr')
  })
})
