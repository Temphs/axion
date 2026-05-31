import fs from "node:fs";

const raw = JSON.parse(
  fs.readFileSync("./mock/aade/mydata-response-sample.json", "utf8")
);

function eurosToCents(amount) {
  return Math.round(amount * 100);
}

function normalize(invoice) {
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

    supplier_name:
      invoice.direction === "expense"
        ? invoice.issuerName
        : invoice.counterpartyName,

    customer_name:
      invoice.direction === "revenue"
        ? invoice.counterpartyName
        : invoice.issuerName,

    net_amount_cents: eurosToCents(invoice.netAmount),
    vat_amount_cents: eurosToCents(invoice.vatAmount),
    gross_amount_cents: eurosToCents(invoice.grossAmount),

    vat_rate: invoice.vatRate,
    currency: invoice.currency,

    expense_revenue_category: invoice.direction,

    classification_category: invoice.classificationCategory,
    classification_type: invoice.classificationType,

    description: invoice.description,
    payment_status: invoice.paymentStatus ?? "unknown",
    special_case: invoice.specialCase,
  };
}

const normalized = raw.invoices.map(normalize);

console.log("Normalized invoices:", normalized.length);
console.table(
  normalized.map((invoice) => ({
    mark: invoice.aade_mark,
    number: invoice.invoice_number,
    type: invoice.invoice_type_label,
    category: invoice.expense_revenue_category,
    net: invoice.net_amount_cents,
    vat: invoice.vat_amount_cents,
    gross: invoice.gross_amount_cents,
    special: invoice.special_case ?? "-",
  }))
);