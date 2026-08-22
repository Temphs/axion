// Landing-page copy. The public page sells one thing: MyEmployee — knowing
// which clients are actually profitable. Future modules are named as future.
// No claim here should describe something the product cannot do today.
const el = {
  nav: {
    links: ['Το πρόβλημα', 'Πώς λειτουργεί', 'Dashboard', 'Επικοινωνία'],
    signIn: 'Σύνδεση',
    bookDemo: 'Κλείστε Demo',
    home: 'Αρχική Axion',
    toggleMenu: 'Εναλλαγή μενού',
  },
  hero: {
    badge: 'MyEmployee · Διαθέσιμο τώρα',
    titleLead: 'Δείτε ποιοι πελάτες ',
    titleHighlight: 'είναι πραγματικά κερδοφόροι.',
    subtitle:
      'Η Axion συνδέει τον χρόνο των εργαζομένων με το κόστος εργασίας και την αμοιβή κάθε πελάτη — ώστε ένα λογιστικό γραφείο να βλέπει ποιοι πελάτες αφήνουν κέρδος και ποιοι τρώνε το περιθώριο.',
    ctaPrimary: 'Κλείστε Demo',
    ctaSecondary: 'Δείτε πώς λειτουργεί',
    trustBullets: [
      'Για λογιστικά γραφεία 5–30 ατόμων',
      'Κόστος εργασίας ανά πελάτη',
      'Χωρίς επιτήρηση εργαζομένων',
    ],
  },
  heroDashboard: {
    address: 'app.axion.io / overview',
    period: 'Απρίλιος 2026',
    vsPrevious: 'vs προηγ. μήνα',
    kpis: [
      { label: 'Ώρες ομάδας', value: '2.184ω', delta: '+6,2%' },
      { label: 'Κόστος εργασίας', value: '€24.620', delta: '+3,1%' },
      { label: 'Ενεργοί πελάτες', value: '83', delta: '' },
      { label: 'Entries Completed', value: '93%', delta: '' },
    ],
    tableTitle: 'Κερδοφορία πελατών',
    tableSub: 'Αμοιβή − κόστος εργασίας = συνεισφορά',
    columns: ['Πελάτης', 'Αμοιβή', 'Ώρες', 'Κόστος', 'Συνεισφορά', 'Περιθώριο'],
    rows: [
      { name: 'Alpha Ltd', fee: '€850', hours: '14ω', cost: '€290', contribution: '€560', margin: '66%', watch: false },
      { name: 'Beta SA', fee: '€600', hours: '27ω', cost: '€510', contribution: '€90', margin: '15%', watch: true },
      { name: 'Gamma PC', fee: '€1.100', hours: '18ω', cost: '€350', contribution: '€750', margin: '68%', watch: false },
    ],
    watchLabel: 'χαμηλό περιθώριο',
    floatContributionTitle: 'Συνεισφορά €12,4k',
    floatContributionSub: 'αυτόν τον μήνα',
    floatMarginTitle: 'Beta SA · 15% περιθώριο',
    floatMarginSub: 'αξίζει αναθεώρηση τιμής',
  },
  trust: {
    eyebrow: 'Φτιαγμένο για λογιστικά γραφεία',
    badges: ['GDPR', 'Κρυπτογράφηση SSL', 'Χωρίς screenshots'],
    indicators: [
      {
        title: '27 ημέρες δεδομένων',
        desc: 'Κάθε αριθμός συνοδεύεται από το πόσο πλήρη είναι τα δεδομένα πίσω του.',
      },
      {
        title: '93% πληρότητα καταχωρήσεων',
        desc: 'Βλέπετε ποιες ημέρες λείπουν πριν βασιστείτε σε ένα περιθώριο.',
      },
      {
        title: 'Καμία παρακολούθηση',
        desc: 'Χωρίς screenshots, χωρίς καταγραφή πληκτρολογίου, χωρίς βαθμολογίες εργαζομένων.',
      },
    ],
  },
  problem: {
    eyebrow: 'Το πρόβλημα',
    title: 'Ξέρετε τι πληρώνει ο κάθε πελάτης. Ξέρετε τι σας κοστίζει;',
    items: [
      {
        title: 'Οι πάγιες αμοιβές κρύβουν τον χρόνο',
        desc: 'Μια σταθερή μηνιαία αμοιβή δεν λέει πόσες ώρες προσωπικού κατανάλωσε ο πελάτης.',
      },
      {
        title: 'Ο ακριβότερος πελάτης δεν είναι ο πιο κερδοφόρος',
        desc: 'Ένας πελάτης €1.000 που ζητά 35 ώρες μπορεί να είναι χειρότερος από έναν πελάτη €600 με 8 ώρες.',
      },
      {
        title: 'Η τιμολόγηση γίνεται στο ένστικτο',
        desc: 'Οι αναπροσαρμογές αποφασίζονται χωρίς πραγματικό κόστος εργασίας μπροστά σας.',
      },
    ],
    note: 'Η Axion δίνει πραγματικό κόστος εργασίας και περιθώριο ανά πελάτη — πριν την επόμενη συζήτηση τιμής.',
  },
  howItWorks: {
    eyebrow: 'Πώς λειτουργεί',
    title: 'Τρία βήματα, ένας κλειστός κύκλος.',
    steps: [
      {
        title: 'Οι εργαζόμενοι καταγράφουν τη δουλειά τους',
        desc: 'Πελάτης → εργασία → χρόνος. Σχεδιασμένο να παίρνει δευτερόλεπτα.',
      },
      {
        title: 'Η Axion υπολογίζει το πραγματικό κόστος εργασίας',
        desc: 'Το κόστος κάθε εργαζόμενου κατανέμεται στους πελάτες με βάση τον χρόνο που δόθηκε.',
      },
      {
        title: 'Ο ιδιοκτήτης βλέπει την κερδοφορία πελατών',
        desc: 'Αμοιβή, κόστος εργασίας, συνεισφορά και περιθώριο — σε ένα σημείο.',
      },
    ],
  },
  ownerDashboard: {
    eyebrow: 'Owner dashboard',
    title: 'Το γραφείο σας σε μία οθόνη.',
    subtitle:
      'Δείτε πού πήγαν οι ώρες της ομάδας, τι κόστισαν, και ποιοι πελάτες καταναλώνουν το περιθώριό σας.',
    address: 'app.axion.io / overview',
    period: 'Απρίλιος 2026 · ενδεικτικά στοιχεία',
    metrics: [
      { label: 'Ώρες ομάδας', value: '2.184ω', sub: '9 άτομα κατέγραψαν χρόνο' },
      { label: 'Κόστος εργασίας', value: '€24.620', sub: '87% σε χρεώσιμους πελάτες' },
      { label: 'Ενεργοί πελάτες', value: '83', sub: '61 με δραστηριότητα' },
      { label: 'Entries Completed', value: '93%', sub: '21 εργάσιμες ημέρες' },
    ],
    profitabilityTitle: 'Κερδοφορία πελατών',
    profitabilitySub: 'Καλύπτει η αμοιβή τον χρόνο που αφιερώνεται;',
    columns: ['Πελάτης', 'Αμοιβή', 'Ώρες', 'Κόστος εργασίας', 'Συνεισφορά', 'Περιθώριο'],
    rows: [
      { name: 'Gamma PC', fee: '€1.100', hours: '18ω', cost: '€350', contribution: '€750', margin: '68%', watch: false },
      { name: 'Alpha Ltd', fee: '€850', hours: '14ω', cost: '€290', contribution: '€560', margin: '66%', watch: false },
      { name: 'Delta PC', fee: '€780', hours: '22ω', cost: '€430', contribution: '€350', margin: '45%', watch: false },
      { name: 'Beta SA', fee: '€600', hours: '27ω', cost: '€510', contribution: '€90', margin: '15%', watch: true },
    ],
    timeTitle: 'Πού πήγε ο χρόνος',
    timeSub: 'Ώρες ανά πελάτη, αυτόν τον μήνα',
    timeRows: [
      { name: 'Beta SA', hours: '27ω', pct: 100 },
      { name: 'Delta PC', hours: '22ω', pct: 81 },
      { name: 'Gamma PC', hours: '18ω', pct: 67 },
      { name: 'Alpha Ltd', hours: '14ω', pct: 52 },
      { name: 'Εσωτερικά', hours: '9ω', pct: 33 },
    ],
    formula: 'Συνεισφορά = Αμοιβή − Κόστος εργασίας · Περιθώριο = Συνεισφορά ÷ Αμοιβή',
    watchLabel: 'χαμηλό περιθώριο',
  },
  attention: {
    eyebrow: 'Clients needing attention',
    title: 'Ξέρετε πού να κοιτάξετε πρώτα.',
    subtitle: 'Το πολύ τρία σημεία. Όχι κέντρο ειδοποιήσεων, όχι ουρά από alerts.',
    items: [
      { name: 'Παπαδάκης ΑΕ', reason: 'Το κόστος εργασίας αυξήθηκε 31% αυτόν τον μήνα.' },
      { name: 'Alpha Ltd', reason: 'Το 84% της μηνιαίας αμοιβής καταναλώθηκε από κόστος εργασίας.' },
      { name: 'Delta PC', reason: 'Το περιθώριο έπεσε από 44% σε 19%.' },
    ],
    note: 'Κάθε σημείο αναφέρει τον κανόνα που το παρήγαγε, ώστε να το κρίνετε μόνοι σας.',
  },
  terminal: {
    eyebrow: 'Για τους εργαζόμενους',
    title: 'Φτιαγμένο για να το χρησιμοποιούν πραγματικά.',
    subtitle:
      'Χωρίς Excel. Χωρίς περίπλοκα timesheets. Ο εργαζόμενος επιλέγει πελάτη, εργασία και χρόνο σε δευτερόλεπτα.',
    bullets: [
      'Προσωπικός σύνδεσμος — χωρίς λογαριασμό και χωρίς κωδικό',
      'Οι πελάτες που δούλεψε πρόσφατα εμφανίζονται πρώτοι',
      'Διορθώνει μόνος του τα λάθη του, χωρίς να σας πάρει τηλέφωνο',
    ],
    objection: 'Ο εργαζόμενος δεν βλέπει κόστη, αμοιβές, ποσοστά ή βαθμολογίες. Βλέπει μόνο τι κατέγραψε.',
    mock: {
      greeting: 'Γεια σου',
      name: 'Μαρία',
      today: 'Σήμερα',
      dayHours: '6,5 ώ καταγεγραμμένες',
      clientLabel: 'Πελάτης',
      clients: ['Alpha Ltd', 'Beta SA', 'Gamma PC', 'Delta PC'],
      searchLabel: 'Άλλος πελάτης…',
      hoursLabel: 'Ώρες',
      taskLabel: 'Τι έκανες',
      tasks: ['Λογιστική', 'ΦΠΑ', 'Μισθοδοσία'],
      submit: 'Καταχώρηση',
      listTitle: 'Σήμερα',
      entries: [
        { client: 'Alpha Ltd', task: 'Λογιστική', hours: '4 ώ' },
        { client: 'Beta SA', task: 'ΦΠΑ', hours: '2,5 ώ' },
      ],
    },
  },
  team: {
    eyebrow: 'Team overview',
    title: 'Λειτουργικά στοιχεία, όχι βαθμολογίες.',
    subtitle:
      'Ώρες, δουλειά για πελάτες, overhead και κόστος εργασίας. Καμία κατάταξη, κανένα σκορ παραγωγικότητας.',
    columns: ['Εργαζόμενος', 'Ώρες', 'Δουλειά πελατών', 'Overhead', 'Κόστος εργασίας'],
    rows: [
      { name: 'Μαρία Π.', logged: '164ω', client: '142ω', overhead: '22ω', cost: '€3.240' },
      { name: 'Νίκος Κ.', logged: '151ω', client: '128ω', overhead: '23ω', cost: '€2.910' },
    ],
    note: 'Δεν εμφανίζουμε κατάταξη εργαζομένων, σκορ απόδοσης ή ασαφή ποσοστά.',
  },
  modules: {
    eyebrow: 'Roadmap',
    title: 'Η Axion γίνεται το επίπεδο χρηματοοικονομικής ευφυΐας του γραφείου σας.',
    subtitle: 'Ένα module τη φορά, και μόνο όταν είναι πραγματικά έτοιμο.',
    availableLabel: 'Διαθέσιμο τώρα',
    soonLabel: 'Σύντομα',
    items: [
      {
        name: 'MyEmployee',
        desc: 'Χρόνος εργαζομένων, κόστος εργασίας και κερδοφορία ανά πελάτη.',
        available: true,
      },
      {
        name: 'MyVAT',
        desc: 'Εκτίμηση ΦΠΑ από τα δεδομένα τιμολόγησης του γραφείου.',
        available: false,
      },
      {
        name: 'P&L Intelligence',
        desc: 'Έσοδα, έξοδα και περιθώρια σε επίπεδο γραφείου.',
        available: false,
      },
    ],
    note: 'Ό,τι δεν είναι διαθέσιμο σημειώνεται καθαρά. Δεν πουλάμε λειτουργίες που δεν υπάρχουν ακόμη.',
  },
  cta: {
    badge: 'Δείτε το στα δικά σας δεδομένα',
    title: 'Ποιοι πελάτες σας αφήνουν πραγματικά κέρδος;',
    subtitle:
      'Κλείστε ένα demo. Θα δείτε την κερδοφορία πελατών με τα δικά σας νούμερα, όχι με παραδείγματα.',
    primary: 'Κλείστε Demo',
    secondary: 'Επικοινωνία',
  },
  footer: {
    tagline:
      'Κερδοφορία πελατών για λογιστικά γραφεία. Χρόνος, κόστος εργασίας και περιθώριο — σε ένα σημείο.',
    location: 'Αθήνα, Ελλάδα',
    columns: [
      { title: 'Προϊόν', links: ['MyEmployee', 'Πώς λειτουργεί', 'Dashboard'] },
      { title: 'Εταιρεία', links: ['Για λογιστικά γραφεία', 'Roadmap', 'Επικοινωνία'] },
      { title: 'Νομικά', links: ['Απόρρητο', 'Όροι Χρήσης', 'Cookies'] },
    ],
    rights: 'Με επιφύλαξη παντός δικαιώματος.',
    legal: ['Απόρρητο', 'Όροι', 'Cookies'],
  },
  lead: {
    eyebrow: 'Ξεκινήστε',
    title: 'Κλείστε demo στα δικά σας δεδομένα',
    subtitle: 'Συμπληρώστε τη φόρμα και επικοινωνούμε εντός μίας εργάσιμης ημέρας.',
    name: 'Ονοματεπώνυμο',
    namePlaceholder: 'Το όνομά σας',
    email: 'Email',
    emailPlaceholder: 'you@company.gr',
    phone: 'Τηλέφωνο',
    phonePlaceholder: 'Το τηλέφωνό σας',
    company: 'Γραφείο',
    companyPlaceholder: 'Επωνυμία γραφείου',
    submit: 'Κλείστε demo',
    sending: 'Αποστολή…',
    successTitle: 'Ευχαριστούμε!',
    success: 'Λάβαμε το αίτημά σας — θα επικοινωνήσουμε σύντομα.',
    privacy: 'Τα στοιχεία σας είναι ασφαλή. Χωρίς spam.',
    requiredError: 'Συμπληρώστε αυτό το πεδίο',
    emailError: 'Δώστε έγκυρο email',
  },
  stickyCta: 'Κλείστε demo',
  meta: {
    title: 'Axion — Κερδοφορία πελατών για λογιστικά γραφεία',
    description:
      'Η Axion συνδέει τον χρόνο των εργαζομένων με το κόστος εργασίας και την αμοιβή κάθε πελάτη, ώστε τα λογιστικά γραφεία να βλέπουν ποιοι πελάτες είναι πραγματικά κερδοφόροι.',
  },
}

export type Dictionary = typeof el

export default el
