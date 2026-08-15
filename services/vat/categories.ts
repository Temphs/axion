// Category and VAT-rate configuration for the Greek VAT module.
// Rates are configuration, not law: the accountant-facing UI always allows
// overrides, and nothing here should be treated as tax advice.

export const INVOICE_CATEGORIES = [
  'sales_revenue',
  'service_revenue',
  'product_purchases',
  'professional_services',
  'rent',
  'utilities',
  'telecom',
  'fuel_vehicle',
  'office_supplies',
  'equipment_assets',
  'travel',
  'meals_entertainment',
  'payroll_related',
  'taxes_fees',
  'reverse_charge',
  'intra_community_acquisition',
  'non_deductible',
  'other_review',
] as const

export type InvoiceCategory = (typeof INVOICE_CATEGORIES)[number]

export const CATEGORY_LABELS: Record<InvoiceCategory, { el: string; en: string }> = {
  sales_revenue: { el: 'Έσοδα από πωλήσεις', en: 'Sales revenue' },
  service_revenue: { el: 'Έσοδα από υπηρεσίες', en: 'Service revenue' },
  product_purchases: { el: 'Αγορές εμπορευμάτων', en: 'Product purchases' },
  professional_services: { el: 'Αμοιβές τρίτων / επαγγελματικές υπηρεσίες', en: 'Professional services' },
  rent: { el: 'Ενοίκια', en: 'Rent' },
  utilities: { el: 'Λογαριασμοί κοινής ωφέλειας', en: 'Utilities' },
  telecom: { el: 'Τηλεπικοινωνίες', en: 'Telecommunications' },
  fuel_vehicle: { el: 'Καύσιμα / έξοδα οχημάτων', en: 'Fuel / vehicle expense' },
  office_supplies: { el: 'Γραφική ύλη / αναλώσιμα', en: 'Office supplies' },
  equipment_assets: { el: 'Εξοπλισμός / πάγια', en: 'Equipment / assets' },
  travel: { el: 'Ταξίδια / μετακινήσεις', en: 'Travel' },
  meals_entertainment: { el: 'Εστίαση / φιλοξενία', en: 'Meals / entertainment' },
  payroll_related: { el: 'Μισθοδοσία / εισφορές', en: 'Payroll-related' },
  taxes_fees: { el: 'Φόροι / τέλη', en: 'Taxes / fees' },
  reverse_charge: { el: 'Αντίστροφη επιβάρυνση', en: 'Reverse charge' },
  intra_community_acquisition: { el: 'Ενδοκοινοτική απόκτηση', en: 'Intra-community acquisition' },
  non_deductible: { el: 'Μη εκπιπτόμενη δαπάνη', en: 'Non-deductible expense' },
  other_review: { el: 'Λοιπά / προς έλεγχο', en: 'Other / needs review' },
}

export type VatTreatment =
  | 'standard'
  | 'exempt'
  | 'zero_rated'
  | 'reverse_charge'
  | 'intra_community'
  | 'out_of_scope'

// myDATA vatCategory codes → VAT rate in basis points (2400 = 24%).
// Codes 4/5/6 are the reduced Aegean-island rates; 8 marks records outside the
// scope of VAT (e.g. payroll); 9/10 were introduced in later spec versions.
// null = "no VAT involved" as opposed to a 0% rate.
export type VatConfig = {
  vatCategoryRatesBps: Record<number, number | null>
  standardRateBps: number
  knownRatesBps: number[]
}

export const defaultVatConfig: VatConfig = {
  vatCategoryRatesBps: {
    1: 2400,
    2: 1300,
    3: 600,
    4: 1700,
    5: 900,
    6: 400,
    7: 0,
    8: null,
    9: 300,
    10: 400,
  },
  standardRateBps: 2400,
  knownRatesBps: [2400, 1300, 600, 1700, 900, 400, 300, 0],
}

export function rateBpsForVatCategory(
  code: number | null | undefined,
  config: VatConfig = defaultVatConfig
): number | null {
  if (code == null) return null
  return config.vatCategoryRatesBps[code] ?? null
}
