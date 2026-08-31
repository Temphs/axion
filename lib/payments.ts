import type { ClientPaymentInfo } from '@/lib/profitability'

// ── Client payments are not stored yet ───────────────────────────────────────
// The Client model holds `monthlyRevenue` (the agreed fee) and nothing about what
// was actually invoiced or collected (prisma/schema.prisma). The client cards are
// written against this resolver, so adding the table is the only change needed:
//
//   CREATE TABLE ClientPayment (
//     id        TEXT PRIMARY KEY,
//     userId    TEXT NOT NULL,
//     clientId  TEXT NOT NULL,
//     month     TEXT NOT NULL,   -- YYYY-MM
//     invoiced  REAL NOT NULL DEFAULT 0,
//     paid      REAL NOT NULL DEFAULT 0,
//     paidOn    DATETIME
//   );
//
// Until then invoiced/paid stay null — "not recorded", which the card states
// plainly. No demo amounts are substituted in the production path, because a
// card showing an invented "Paid €650" is worse than a card showing nothing.

export type PaymentHistoryEntry = {
  month: string // YYYY-MM
  invoiced: number
  paid: number
}

export type ClientPaymentRecord = ClientPaymentInfo & {
  clientId: string
  monthlyFee: number
  history: PaymentHistoryEntry[]
}

export function resolveClientPayments(clientId: string, monthlyFee: number): ClientPaymentRecord {
  return { clientId, monthlyFee, invoiced: null, paid: null, history: [] }
}
