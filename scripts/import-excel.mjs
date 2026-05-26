// Imports scripts/excel-data.json into the running app via its HTTP API.
//   node scripts/import-excel.mjs            (defaults to http://localhost:3001)
//   BASE=http://localhost:3000 node scripts/import-excel.mjs
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const BASE = process.env.BASE ?? 'http://localhost:3001'
const ACCOUNT = { email: 'astav2112004@gmail.com', password: 'Art123emis', name: 'Artemios' }

const here = dirname(fileURLToPath(import.meta.url))
const data = JSON.parse(readFileSync(join(here, 'excel-data.json'), 'utf8'))

let cookie = ''
async function api(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const sc = res.headers.get('set-cookie')
  if (sc) cookie = sc.split(';')[0]
  const text = await res.text()
  let json
  try { json = JSON.parse(text) } catch { json = text }
  return { status: res.status, json }
}

function dedupeByName(rows) {
  const seen = new Set()
  return rows.filter((r) => {
    const k = r.name
    if (!k || seen.has(k)) return false
    seen.add(k)
    return true
  })
}

// 1. Create the manager account (or log in if it already exists).
let auth = await api('POST', '/api/auth/signup', ACCOUNT)
if (auth.status === 409) auth = await api('POST', '/api/auth/login', { email: ACCOUNT.email, password: ACCOUNT.password })
if (auth.status >= 400) throw new Error('auth failed: ' + JSON.stringify(auth.json))
console.log(`✓ account ready: ${ACCOUNT.email} (${auth.status})`)

// 2. Settings.
await api('PATCH', '/api/settings', data.settings)
console.log('✓ settings applied')

// 3. Employees -> name->id map.
const empMap = new Map()
for (const e of dedupeByName(data.employees)) {
  const r = await api('POST', '/api/employees', { name: e.name, monthlyCost: e.monthlyCost ?? 0, notes: e.notes ?? null })
  if (r.status === 201) empMap.set(e.name, r.json.employee.id)
  else console.warn(`  employee "${e.name}" -> ${r.status} ${JSON.stringify(r.json)}`)
}
console.log(`✓ employees: ${empMap.size}`)

// 4. Clients -> name->id map (parallel in chunks).
const clientMap = new Map()
const clients = dedupeByName(data.clients)
const CHUNK = 24
for (let i = 0; i < clients.length; i += CHUNK) {
  const slice = clients.slice(i, i + CHUNK)
  const results = await Promise.all(
    slice.map((c) => api('POST', '/api/clients', { name: c.name, billable: !!c.billable, monthlyRevenue: c.monthlyRevenue ?? 0 }))
  )
  results.forEach((r, j) => {
    if (r.status === 201) clientMap.set(slice[j].name, r.json.client.id)
    else console.warn(`  client "${slice[j].name}" -> ${r.status}`)
  })
}
console.log(`✓ clients: ${clientMap.size}`)

// helpers to auto-create references found in entries but missing from the lists above
async function ensureEmployee(name) {
  if (empMap.has(name)) return empMap.get(name)
  const r = await api('POST', '/api/employees', { name })
  const id = r.json?.employee?.id
  if (id) empMap.set(name, id)
  return id
}
async function ensureClient(name) {
  if (clientMap.has(name)) return clientMap.get(name)
  const r = await api('POST', '/api/clients', { name, billable: true })
  const id = r.json?.client?.id
  if (id) clientMap.set(name, id)
  return id
}

// 5. Entries (resolve names -> ids, auto-create missing, batch insert).
let autoEmp = 0, autoCli = 0
const prepared = []
for (const e of data.entries) {
  let employeeId = empMap.get(e.employee)
  if (!employeeId) { employeeId = await ensureEmployee(e.employee); autoEmp++ }
  let clientId = clientMap.get(e.client)
  if (!clientId) { clientId = await ensureClient(e.client); autoCli++ }
  prepared.push({ date: e.date, employeeId, clientId, workType: e.workType ?? null, minutes: e.minutes, notes: e.notes ?? null, externalId: e.externalId })
}
if (autoEmp || autoCli) console.log(`  (auto-created ${autoEmp} employee refs, ${autoCli} client refs from entries)`)

let processed = 0
const BATCH = 300
for (let i = 0; i < prepared.length; i += BATCH) {
  const batch = prepared.slice(i, i + BATCH)
  const r = await api('POST', '/api/entries', { entries: batch })
  if (r.status === 201) processed += r.json.processed
  else { console.error(`  entries batch ${i}-${i + batch.length} -> ${r.status} ${JSON.stringify(r.json).slice(0, 300)}`); break }
}
console.log(`✓ entries: ${processed}`)

// 6. Spot-check the stats over the full data span.
const summary = await api('GET', '/api/stats/summary?from=2023-01-01&to=2025-01-01')
console.log('\n# stats summary (all data):')
console.log(JSON.stringify(summary.json.summary, null, 2))
