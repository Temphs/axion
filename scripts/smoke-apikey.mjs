// Smoke test for companion-app API-key auth. Dev server must be up:
//   node scripts/smoke-apikey.mjs
const B = 'http://localhost:3000'

async function call(method, path, { cookie, token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (cookie) headers.cookie = cookie
  if (token) headers.authorization = `Bearer ${token}`
  const res = await fetch(B + path, { method, headers, body: body ? JSON.stringify(body) : undefined })
  const setCookie = res.headers.get('set-cookie')
  const text = await res.text()
  let json
  try { json = JSON.parse(text) } catch { json = text }
  return { status: res.status, json, setCookie }
}
const log = (label, r) => console.log(`\n# ${label} -> ${r.status}\n` + JSON.stringify(r.json, null, 2))

// 1. Manager session (reuse the seeded account; fall back to a fresh signup).
let login = await call('POST', '/api/auth/login', { body: { email: 'manager@axion.gr', password: 'supersecret' } })
if (login.status !== 200) {
  login = await call('POST', '/api/auth/signup', { body: { email: `mgr_${Date.now()}@axion.gr`, password: 'supersecret', name: 'Mgr' } })
}
const cookie = login.setCookie.split(';')[0]
console.log('# manager session ok')

// 2. Create an API key.
const created = await call('POST', '/api/api-keys', { cookie, body: { name: 'time-tracker-app' } })
log('create api key (token shown once)', created)
const token = created.json.token

// 3. Use the key (no cookie) to resolve employees/clients.
const emps = await call('GET', '/api/employees', { token })
console.log(`\n# GET /employees with API key -> ${emps.status}, count=${emps.json.employees?.length}`)
const clients = await call('GET', '/api/clients', { token })
console.log(`# GET /clients with API key -> ${clients.status}, count=${clients.json.clients?.length}`)

const employeeId = emps.json.employees?.[0]?.id
const clientId = clients.json.clients?.[0]?.id

// 4. Ingest an entry using only the API key.
const ingest = await call('POST', '/api/entries', {
  token,
  body: { entries: [{ date: '2024-09-01', employeeId, clientId, minutes: 90, workType: 'Καταχώρηση', externalId: 'apikey-test-1' }] },
})
log('ingest entry with API key', ingest)

// 5. API key must NOT reach session-only endpoints (stats).
const stats = await call('GET', '/api/stats/summary', { token })
console.log(`\n# GET /stats/summary with API key (expect 401) -> ${stats.status}`)

// 6. Revoke the key.
const revoke = await call('DELETE', `/api/api-keys/${created.json.apiKey.id}`, { cookie })
log('revoke key', revoke)

// 7. Revoked key must now fail.
const afterRevoke = await call('GET', '/api/employees', { token })
console.log(`\n# GET /employees with revoked key (expect 401) -> ${afterRevoke.status}`)
