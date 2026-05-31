export type MockAadeInvoice = {
  mark: string;
  uid: string;
  invoiceNumber: string;
  invoiceType?: string;
  invoiceTypeLabel?: string;
  invoiceDate: string;
  issuerVatNumber: string;
  issuerName?: string;
  counterpartyVatNumber: string;
  counterpartyName?: string;
  direction: "revenue" | "expense";
  netAmount: number;
  vatRate?: number;
  vatAmount: number;
  grossAmount: number;
  currency: string;
  classificationCategory?: string;
  classificationType?: string;
  description?: string;
  paymentStatus?: "unknown" | "unpaid" | "paid" | "partial" | "overdue";
  specialCase?: string;
};

export type MockAadeResponse = {
  source: string;
  environment: string;
  generatedAt: string;
  company?: {
    companyId: string;
    name: string;
    vatNumber: string;
    country: string;
  };
  invoices: MockAadeInvoice[];
};

export type NormalizedAadeInvoice = {
  source: "aade_mydata";
  status: "synced";

  aade_mark: string;
  aade_uid: string;

  invoice_number: string;
  invoice_type?: string;
  invoice_type_label?: string;
  invoice_date: string;

  issuer_vat_number: string;
  issuer_name?: string;

  counterparty_vat_number: string;
  counterparty_name?: string;

  supplier_name?: string;
  customer_name?: string;

  net_amount_cents: number;
  vat_amount_cents: number;
  gross_amount_cents: number;

  vat_rate?: number;
  currency: string;

  expense_revenue_category: "revenue" | "expense";

  classification_category?: string;
  classification_type?: string;

  description?: string;
  payment_status: "unknown" | "unpaid" | "paid" | "partial" | "overdue";
  special_case?: string;
};