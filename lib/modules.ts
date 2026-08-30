// Which product modules this deployment exposes.
//
// The dashboard ships three: MyEmployee (complete), VAT Analysis (needs the
// myDATA tables and AADE credentials) and MyCFO (a demo shell with placeholder
// figures). A deployment handed to a client for MyEmployee alone should not
// advertise the other two — a tab that errors or shows invented numbers reads
// as "this product is broken", and any feedback it draws is noise.
//
// Set AXION_MODULES to a comma-separated list, e.g. AXION_MODULES=myemployee.
// Unset means all modules, which is what local development wants.
//
// Deliberately free of `server-only` and of any database import: proxy.ts
// consults it to reject a disabled module's routes before rendering begins,
// which is the only layer that can answer a real 404 for a page that streams.

export const MODULE_IDS = ['myemployee', 'vat', 'mycfo'] as const
export type ModuleId = (typeof MODULE_IDS)[number]

export function enabledModules(): ModuleId[] {
  const raw = process.env.AXION_MODULES?.trim()
  if (!raw) return [...MODULE_IDS]

  const requested = new Set(raw.split(',').map((m) => m.trim().toLowerCase()).filter(Boolean))
  // MyEmployee is the base module — the dashboard root belongs to it, so it is
  // always on and a typo in the list can never lock the operator out entirely.
  const enabled = MODULE_IDS.filter((id) => id === 'myemployee' || requested.has(id))
  return enabled
}

export function isModuleEnabled(id: ModuleId): boolean {
  return enabledModules().includes(id)
}
