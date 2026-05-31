import type {
  MockAadeInvoice,
  MockAadeResponse,
  NormalizedAadeInvoice,
} from "./types";

function eurosToCents(amount: number): number {
  return Math.round(amount * 100);
}

function normalizePaymentStatus(
  status: MockAadeInvoice["paymentStatus"]
): NormalizedAadeInvoice["payment_status"] {
  return status ?? "unknown";
}

function resolveSupplierName(invoice: MockAadeInvoice): string | undefined {
  if (invoice.direction === "expense") {
    return invoice.issuerName;
  }

  return invoice.counterpartyName;
}

function resolveCustomerName(invoice: MockAadeInvoice): string | undefined {
  if (invoice.direction === "revenue") {
    return invoice.counterpartyName;
  }

  return invoice.issuerName;
}

export function normalizeAadeInvoice(
  invoice: MockAadeInvoice
): NormalizedAadeInvoice {
  return {
    source: "aade_mydata",
    status: "synced",

    aade_mark: invoice.mark,
    aade_uid: invoice.uid,

    invoice_number: invoice.invoiceNumber,
    invoice_type: invoice.invoiceType,
    invoice_type_label: invoice.invoiceTypeLabel,
    invoice_date: invoice.invoiceDate,

    issuer_vat_number: invoice.issuerVatNumber,
    issuer_name: invoice.issuerName,

    counterparty_vat_number: invoice.counterpartyVatNumber,
    counterparty_name: invoice.counterpartyName,

    supplier_name: resolveSupplierName(invoice),
    customer_name: resolveCustomerName(invoice),

    net_amount_cents: eurosToCents(invoice.netAmount),
    vat_amount_cents: eurosToCents(invoice.vatAmount),
    gross_amount_cents: eurosToCents(invoice.grossAmount),

    vat_rate: invoice.vatRate,
    currency: invoice.currency,

    expense_revenue_category: invoice.direction,

    classification_category: invoice.classificationCategory,
    classification_type: invoice.classificationType,

    description: invoice.description,
    payment_status: normalizePaymentStatus(invoice.paymentStatus),
    special_case: invoice.specialCase,
  };
}

export function normalizeAadeInvoices(
  response: MockAadeResponse
): NormalizedAadeInvoice[] {
  return response.invoices.map(normalizeAadeInvoice);
}