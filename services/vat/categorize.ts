import type { InvoiceCategory, VatTreatment } from './categories'

// Hybrid invoice categorization: deterministic rules first, then a lightweight
// learned scorer (token frequencies from the accountant's past manual
// corrections), and finally `other_review`. A manual override — applied by the
// caller, never here — always outranks everything this engine produces.
//
// Every result carries a confidence score and a human-readable explanation so
// the accountant can see *why* an invoice landed where it did.

export type CategorizationInput = {
  direction: 'income' | 'expense'
  invoiceType?: string | null
  aadeClassificationCategory?: string | null
  aadeClassificationType?: string | null
  counterpartyVatNumber?: string | null
  issuerVatNumber?: string | null
  supplierName?: string | null // issuer for expenses, counterparty for income
  description?: string | null
  vatRateBps?: number | null
  vatTreatment?: VatTreatment | null
  netCents?: number
}

export type CategorizationResult = {
  category: InvoiceCategory
  confidence: number // 0..1
  explanation: string
  method: 'rule' | 'learned' | 'fallback'
  vatDeductible: boolean
  deductiblePct: number
  nonDeductibleReason?: string
  needsReview: boolean
  reviewReason?: string
}

// Past manual corrections, used both for exact counterparty matches and for
// the learned token scorer.
export type CorrectionExample = {
  counterpartyVatNumber?: string | null
  supplierName?: string | null
  description?: string | null
  category: InvoiceCategory
}

export type CategorizationContext = {
  corrections: CorrectionExample[]
}

/* ─── deterministic rule tables ──────────────────────────────── */

// myDATA income classification categories (category1_*).
const INCOME_CLASSIFICATION_MAP: Record<string, InvoiceCategory> = {
  category1_1: 'sales_revenue', // Έσοδα από πώληση εμπορευμάτων
  category1_2: 'sales_revenue', // Έσοδα από πώληση προϊόντων
  category1_3: 'service_revenue', // Έσοδα από παροχή υπηρεσιών
  category1_4: 'equipment_assets', // Έσοδα από πώληση παγίων
  category1_5: 'other_review', // Λοιπά έσοδα/κέρδη
  category1_7: 'other_review', // Έσοδα για λογαριασμό τρίτων
  category1_8: 'sales_revenue', // Έσοδα προηγούμενων χρήσεων
  category1_9: 'sales_revenue', // Έσοδα επόμενων χρήσεων
  category1_95: 'other_review', // Λοιπά πληροφοριακά στοιχεία εσόδων
}

// myDATA expense classification categories (category2_*).
const EXPENSE_CLASSIFICATION_MAP: Record<string, InvoiceCategory> = {
  category2_1: 'product_purchases', // Αγορές εμπορευμάτων
  category2_2: 'product_purchases', // Αγορές α'-β' υλών
  category2_3: 'professional_services', // Λήψη υπηρεσιών
  category2_4: 'office_supplies', // Γενικά έξοδα με δικαίωμα έκπτωσης
  category2_5: 'non_deductible', // Γενικά έξοδα χωρίς δικαίωμα έκπτωσης
  category2_6: 'payroll_related', // Αμοιβές και παροχές προσωπικού
  category2_7: 'equipment_assets', // Αγορές παγίων
  category2_8: 'equipment_assets', // Αποσβέσεις παγίων
  category2_9: 'other_review', // Έξοδα για λογαριασμό τρίτων
  category2_10: 'other_review', // Έξοδα προηγούμενων χρήσεων
  category2_12: 'other_review', // Λοιπές εγγραφές τακτοποίησης εξόδων
  category2_95: 'other_review', // Λοιπά πληροφοριακά στοιχεία εξόδων
}

// Keyword → category rules, checked against supplier name + description.
// Greek keywords are unaccented lowercase (input is folded the same way).
const KEYWORD_RULES: Array<{ keywords: string[]; category: InvoiceCategory }> = [
  { keywords: ['ενοικι', 'μισθωμα', 'μισθωση ακινητ', 'rent', 'lease'], category: 'rent' },
  { keywords: ['δεη', 'ρευμα', 'ηλεκτρικ', 'ευδαπ', 'υδρευση', 'φυσικο αεριο', 'protergia', 'elpedison', 'ηρων', 'heron', 'electricity', 'water supply', 'energy'], category: 'utilities' },
  { keywords: ['cosmote', 'vodafone', 'nova', 'wind', 'οτε', 'τηλεφων', 'internet', 'κινητη', 'σταθερη', 'telecom'], category: 'telecom' },
  { keywords: ['καυσιμ', 'βενζιν', 'πετρελαιο κινησης', 'diesel', 'εκο ', 'shell', 'avin', 'aegean oil', 'διοδια', 'παρκινγκ', 'parking', 'fuel', 'συνεργειο', 'ελαστικα'], category: 'fuel_vehicle' },
  { keywords: ['λογιστ', 'δικηγορ', 'συμβολαιογραφ', 'μηχανικος', 'συμβουλ', 'consult', 'accounting', 'legal', 'audit', 'μελετη'], category: 'professional_services' },
  { keywords: ['γραφικη υλη', 'αναλωσιμα', 'χαρτικα', 'toner', 'μελανια', 'office supplies', 'plaisio', 'κωτσοβολος', 'stationery'], category: 'office_supplies' },
  { keywords: ['υπολογιστ', 'laptop', 'server', 'μηχανημα', 'εξοπλισμ', 'παγια', 'equipment', 'machinery', 'επιπλα'], category: 'equipment_assets' },
  { keywords: ['ξενοδοχ', 'hotel', 'αεροπορικ', 'aegean air', 'sky express', 'εισιτηρι', 'ferry', 'ακτοπλο', 'booking', 'travel', 'ταξιδ', 'διαμονη'], category: 'travel' },
  { keywords: ['εστιατορι', 'ταβερνα', 'catering', 'καφε', 'coffee', 'restaurant', 'δειπνο', 'γευμα', 'φιλοξενια'], category: 'meals_entertainment' },
  { keywords: ['εφκα', 'ικα', 'μισθοδοσ', 'αποδοχες', 'payroll', 'εισφορες'], category: 'payroll_related' },
  { keywords: ['δου ', 'φορος', 'τελη κυκλοφοριας', 'παραβολο', 'ενφια', 'δημοτικα τελη', 'χαρτοσημο', 'tax office', 'stamp duty'], category: 'taxes_fees' },
]

// Greek VAT deduction restrictions (άρθρο 30 §4 Ν.2859/2000): input VAT on
// meals/entertainment and on passenger-car fuel/costs is generally not
// deductible. This is a *default*, prominently flagged for accountant review.
const DEDUCTIBILITY_DEFAULTS: Partial<
  Record<InvoiceCategory, { vatDeductible: boolean; deductiblePct: number; reason: string; review: boolean }>
> = {
  meals_entertainment: {
    vatDeductible: false,
    deductiblePct: 0,
    reason: 'Δαπάνες εστίασης/φιλοξενίας: ΦΠΑ κατά κανόνα μη εκπιπτόμενος (αρ. 30 §4 Ν.2859/2000)',
    review: true,
  },
  fuel_vehicle: {
    vatDeductible: false,
    deductiblePct: 0,
    reason: 'Καύσιμα/έξοδα ΕΙΧ: έκπτωση ΦΠΑ εξαρτάται από τον τύπο οχήματος — απαιτείται επιβεβαίωση',
    review: true,
  },
  non_deductible: {
    vatDeductible: false,
    deductiblePct: 0,
    reason: 'Χαρακτηρισμός myDATA: δαπάνη χωρίς δικαίωμα έκπτωσης',
    review: false,
  },
  payroll_related: {
    vatDeductible: false,
    deductiblePct: 0,
    reason: 'Μισθοδοσία/εισφορές: εκτός πεδίου ΦΠΑ',
    review: false,
  },
  taxes_fees: {
    vatDeductible: false,
    deductiblePct: 0,
    reason: 'Φόροι/τέλη: εκτός πεδίου ΦΠΑ',
    review: false,
  },
}

/* ─── helpers ────────────────────────────────────────────────── */

// Lowercases and strips Greek accents so keyword matching is robust.
export function foldGreek(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

function tokenize(text: string): string[] {
  return foldGreek(text)
    .split(/[^a-zα-ω0-9]+/)
    .filter((t) => t.length >= 3)
}

function withDeductibility(
  input: CategorizationInput,
  base: Omit<CategorizationResult, 'vatDeductible' | 'deductiblePct' | 'nonDeductibleReason'>
): CategorizationResult {
  // Income invoices don't carry input VAT; deductibility only matters for expenses.
  if (input.direction === 'income') {
    return { ...base, vatDeductible: false, deductiblePct: 0 }
  }
  const rule = DEDUCTIBILITY_DEFAULTS[base.category]
  if (!rule) return { ...base, vatDeductible: true, deductiblePct: 100 }
  return {
    ...base,
    vatDeductible: rule.vatDeductible,
    deductiblePct: rule.deductiblePct,
    nonDeductibleReason: rule.reason,
    needsReview: base.needsReview || rule.review,
    reviewReason: base.reviewReason ?? (rule.review ? rule.reason : undefined),
  }
}

/* ─── the engine ─────────────────────────────────────────────── */

export function categorizeInvoice(
  input: CategorizationInput,
  context: CategorizationContext = { corrections: [] }
): CategorizationResult {
  const text = [input.supplierName, input.description].filter(Boolean).join(' ')
  const folded = foldGreek(text)

  // 1. VAT-treatment structural categories beat everything else.
  if (input.direction === 'expense' && input.vatTreatment === 'intra_community') {
    return withDeductibility(input, {
      category: 'intra_community_acquisition',
      confidence: 0.9,
      explanation: 'Ενδοκοινοτική απόκτηση: αλλοδαπός εκδότης εντός ΕΕ χωρίς ελληνικό ΦΠΑ',
      method: 'rule',
      needsReview: true,
      reviewReason: 'Ενδοκοινοτική συναλλαγή — επιβεβαιώστε αντίστροφη επιβάρυνση (reverse charge)',
    })
  }
  if (input.direction === 'expense' && input.vatTreatment === 'reverse_charge') {
    return withDeductibility(input, {
      category: 'reverse_charge',
      confidence: 0.9,
      explanation: 'Συναλλαγή αντίστροφης επιβάρυνσης (reverse charge)',
      method: 'rule',
      needsReview: true,
      reviewReason: 'Reverse charge — επιβεβαιώστε ταυτόχρονη χρέωση/έκπτωση ΦΠΑ',
    })
  }

  // 2. Exact counterparty match against past manual corrections.
  const counterpartVat =
    input.direction === 'expense' ? input.issuerVatNumber : input.counterpartyVatNumber
  if (counterpartVat) {
    const matches = context.corrections.filter((c) => c.counterpartyVatNumber === counterpartVat)
    if (matches.length > 0) {
      const counts = new Map<InvoiceCategory, number>()
      for (const m of matches) counts.set(m.category, (counts.get(m.category) ?? 0) + 1)
      const [topCategory, topCount] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]
      if (topCount / matches.length >= 0.6) {
        return withDeductibility(input, {
          category: topCategory,
          confidence: 0.92,
          explanation: `Ο λογιστής έχει κατατάξει ξανά αυτόν τον συναλλασσόμενο (ΑΦΜ ${counterpartVat}) ως «${topCategory}» (${topCount}/${matches.length} φορές)`,
          method: 'learned',
          needsReview: false,
        })
      }
    }
  }

  // 3. myDATA classification codes.
  const cls = input.aadeClassificationCategory ?? undefined
  if (cls) {
    const map = input.direction === 'income' ? INCOME_CLASSIFICATION_MAP : EXPENSE_CLASSIFICATION_MAP
    const mapped = map[cls]
    if (mapped && mapped !== 'other_review') {
      return withDeductibility(input, {
        category: mapped,
        confidence: 0.85,
        explanation: `Χαρακτηρισμός myDATA «${cls}»${input.aadeClassificationType ? ` (${input.aadeClassificationType})` : ''}`,
        method: 'rule',
        needsReview: false,
      })
    }
  }

  // 4. Income side: document type is usually decisive.
  if (input.direction === 'income') {
    const type = input.invoiceType ?? ''
    if (type.startsWith('2.') || type === '11.2') {
      return withDeductibility(input, {
        category: 'service_revenue',
        confidence: 0.8,
        explanation: `Τύπος παραστατικού myDATA ${type} (παροχή υπηρεσιών)`,
        method: 'rule',
        needsReview: false,
      })
    }
    if (type.startsWith('1.') || type === '11.1' || type.startsWith('3.')) {
      return withDeductibility(input, {
        category: 'sales_revenue',
        confidence: 0.8,
        explanation: `Τύπος παραστατικού myDATA ${type} (πώληση αγαθών)`,
        method: 'rule',
        needsReview: false,
      })
    }
  }

  // 5. Keyword rules over supplier name + line descriptions. Short keywords
  // (e.g. «ικα», «δεη») match whole words only, so they can't fire inside
  // longer words like «ανταλλακτικά».
  if (folded) {
    const words = new Set(folded.split(/[^a-zα-ω0-9]+/u))
    const matches = (k: string) => (k.length <= 4 && !k.includes(' ') ? words.has(k) : folded.includes(k))
    for (const rule of KEYWORD_RULES) {
      const hit = rule.keywords.find(matches)
      if (hit) {
        return withDeductibility(input, {
          category: rule.category,
          confidence: 0.72,
          explanation: `Λέξη-κλειδί «${hit.trim()}» στην περιγραφή/επωνυμία`,
          method: 'rule',
          needsReview: false,
        })
      }
    }
  }

  // 6. Learned token scorer over past corrections (naive-Bayes-style counts).
  if (folded && context.corrections.length >= 3) {
    const learned = scoreByLearnedTokens(text, context.corrections)
    if (learned && learned.confidence >= 0.55) {
      return withDeductibility(input, {
        category: learned.category,
        confidence: learned.confidence,
        explanation: `Ομοιότητα με ${learned.support} προηγούμενες χειροκίνητες κατατάξεις («${learned.category}»)`,
        method: 'learned',
        needsReview: learned.confidence < 0.7,
        reviewReason: learned.confidence < 0.7 ? 'Χαμηλή βεβαιότητα αυτόματης κατάταξης' : undefined,
      })
    }
  }

  // 7. Fallback: generic bucket, flagged for review.
  const fallback: InvoiceCategory =
    input.direction === 'income' ? (input.vatRateBps === 0 ? 'other_review' : 'sales_revenue') : 'other_review'
  const isWeakIncome = input.direction === 'income' && fallback === 'sales_revenue'
  return withDeductibility(input, {
    category: fallback,
    confidence: isWeakIncome ? 0.4 : 0.2,
    explanation: 'Δεν βρέθηκε κανόνας — απαιτείται έλεγχος από λογιστή',
    method: 'fallback',
    needsReview: true,
    reviewReason: 'Καμία αξιόπιστη αυτόματη κατάταξη',
  })
}

function scoreByLearnedTokens(
  text: string,
  corrections: CorrectionExample[]
): { category: InvoiceCategory; confidence: number; support: number } | null {
  const tokens = new Set(tokenize(text))
  if (tokens.size === 0) return null

  const scores = new Map<InvoiceCategory, number>()
  const support = new Map<InvoiceCategory, number>()
  for (const example of corrections) {
    const exampleTokens = new Set(tokenize([example.supplierName, example.description].filter(Boolean).join(' ')))
    if (exampleTokens.size === 0) continue
    let overlap = 0
    for (const t of tokens) if (exampleTokens.has(t)) overlap++
    if (overlap === 0) continue
    // Jaccard-ish similarity, accumulated per category.
    const sim = overlap / Math.sqrt(tokens.size * exampleTokens.size)
    scores.set(example.category, (scores.get(example.category) ?? 0) + sim)
    support.set(example.category, (support.get(example.category) ?? 0) + 1)
  }
  if (scores.size === 0) return null

  const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1])
  const [category, best] = ranked[0]
  const runnerUp = ranked[1]?.[1] ?? 0
  const total = ranked.reduce((s, [, v]) => s + v, 0)
  // Confidence blends absolute similarity with the margin over the runner-up.
  const confidence = Math.min(0.85, (best / total) * 0.6 + Math.min(best - runnerUp, 0.5) * 0.5 + 0.2)
  return { category, confidence, support: support.get(category) ?? 0 }
}
