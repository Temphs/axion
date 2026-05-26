// Ad-hoc end-to-end smoke test for the productivity backend. Run with the dev server up:
//   node scripts/smoke.mjs
const B = 'http://localhost:3000'
let cookie = ''

async function call(method, path, body) {
  const res = await fetch(B + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const setCookie = res.headers.get('set-cookie')
  if (setCookie) cookie = setCookie.split(';')[0]
  const text = await res.text()
  let json
  try { json = JSON.parse(text) } catch { json = text }
  return { status: res.status, json }
}

const log = (label, r) => console.log(`\n# ${label} -> ${r.status}\n` + JSON.stringify(r.json, null, 2))

const email = `mgr_${Date.now()}@axion.gr`

const signup = await call('POST', '/api/auth/signup', { email, password: 'supersecret', name: 'Manager' })
log('signup', signup)

const emp = await call('POST', '/api/employees', { name: 'Δημήτρης', monthlyCost: 1600, notes: 'Λογιστής' })
log('create employee (Greek)', emp)
const employeeId = emp.json.employee.id

const cli = await call('POST', '/api/clients', { name: 'KOLYMBARI O.E.', billable: true, monthlyRevenue: 500 })
log('create client', cli)
const clientId = cli.json.client.id

const overhead = await call('POST', '/api/clients', { name: 'ΣΥΜΠΛΗΡΩΜΑΤΙΚΟΣ ΧΡΟΝΟΣ', billable: false, monthlyRevenue: 0 })
const overheadClientId = overhead.json.client.id

// Batch ingest (simulating the time-tracking app), with externalId for idempotency.
const batch = await call('POST', '/api/entries', {
  entries: [
    { date: '2024-08-01', employeeId, clientId, workType: 'Καταχώρηση', minutes: 260, externalId: 'ext-1' },
    { date: '2024-08-02', employeeId, clientId, hours: 2, workType: 'Επικοινωνία', externalId: 'ext-2' },
    { date: '2024-08-05', employeeId, clientId: overheadClientId, minutes: 50, workType: 'Λοιπά', externalId: 'ext-3' },
  ],
})
log('batch ingest entries', batch)

// Re-send same batch -> should update, not duplicate (processed=3, total stays 3).
const batchAgain = await call('POST', '/api/entries', {
  entries: [{ date: '2024-08-01', employeeId, clientId, minutes: 300, workType: 'Καταχώρηση', externalId: 'ext-1' }],
})
log('re-ingest ext-1 (idempotent update)', batchAgain)

const list = await call('GET', '/api/entries?from=2024-08-01&to=2024-08-31')
console.log(`\n# list entries -> ${list.status}, total=${list.json.total}`)

log('stats summary (Aug 2024)', await call('GET', '/api/stats/summary?from=2024-08-01&to=2024-08-31'))
log('stats employees', await call('GET', '/api/stats/employees?from=2024-08-01&to=2024-08-31'))
log('stats clients', await call('GET', '/api/stats/clients?from=2024-08-01&to=2024-08-31'))

log('settings', await call('GET', '/api/settings'))

// Deletion guard: employee has entries -> should be blocked (409).
log('delete employee with entries (expect 409)', await call('DELETE', '/api/employees/' + employeeId))
