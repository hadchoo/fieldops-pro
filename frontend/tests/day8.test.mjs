import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const storageKey = 'fieldops.access-token'

// Execute the production TypeScript in memory. Only Vite's build-time environment
// and browser/network boundaries are substituted; validation and session logic
// come directly from src, with no generated files or extra test dependencies.
function loadSource(relativePath, dependencies = {}, bindings = {}) {
  const source = readFileSync(new URL(`../src/${relativePath}`, import.meta.url), 'utf8')
    .replaceAll('import.meta.env', 'viteEnv')
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  })
  const module = { exports: {} }
  const resolveDependency = name => {
    if (Object.hasOwn(dependencies, name)) return dependencies[name]
    if (name.startsWith('.')) throw new Error(`Unconfigured source dependency: ${name}`)
    return require(name)
  }
  new Function('require', 'module', 'exports', ...Object.keys(bindings), outputText)(
    resolveDependency, module, module.exports, ...Object.values(bindings),
  )
  return module.exports
}

function tokenFor(subject = 'synthetic-user', exp = Math.floor(Date.now() / 1000) + 1800) {
  // Deliberately unsigned fixture, used only by mocked requests and expiry parsing.
  return `fixture.${Buffer.from(JSON.stringify({ sub: subject, exp })).toString('base64url')}.fixture`
}

function createHarness({ storedToken, storageUnavailable = false, queryClient, baseUrl } = {}) {
  const values = new Map(storedToken ? [[storageKey, storedToken]] : [])
  const cacheOperations = []
  const storage = {
    getItem(key) { if (storageUnavailable) throw new Error('Storage disabled'); return values.get(key) ?? null },
    setItem(key, value) { if (storageUnavailable) throw new Error('Storage disabled'); values.set(key, value) },
    removeItem(key) { if (storageUnavailable) throw new Error('Storage disabled'); values.delete(key) },
  }
  const client = queryClient ?? {
    cancelQueries() { cacheOperations.push('cancel'); return Promise.resolve() },
    clear() { cacheOperations.push('clear') },
  }
  const session = loadSource('services/session.ts', { './queryClient': { queryClient: client } }, { sessionStorage: storage })
  const network = { fetch: () => { throw new Error('Unexpected network request') } }
  const api = loadSource('services/api.ts', { './session': session }, {
    fetch: (...args) => network.fetch(...args),
    viteEnv: { VITE_API_BASE_URL: baseUrl },
  })
  return { session, api, values, cacheOperations, network }
}

const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json' },
})

test('restores a valid tab session and rejects expired or malformed stored tokens', () => {
  const valid = tokenFor()
  assert.equal(createHarness({ storedToken: valid }).session.getSession().token, valid)
  for (const token of [tokenFor('expired', 1), 'malformed', tokenFor('no-expiry', null)]) {
    const { session, values } = createHarness({ storedToken: token })
    assert.equal(session.getSession().token, null)
    assert.equal(values.has(storageKey), false)
  }
})

test('expiry parser handles base64url payloads and rejects invalid expiry values', () => {
  const { session } = createHarness()
  assert.equal(session.tokenExpiresAt(tokenFor('user', 123)), 123000)
  for (const token of ['bad', 'a.%%%.c', tokenFor('user', '123'), tokenFor('user', null)]) {
    assert.equal(session.tokenExpiresAt(token), null)
  }
})

test('session changes cancel before clearing cache, increment version, notify, and clear tab storage', () => {
  const { session, values, cacheOperations } = createHarness()
  const snapshots = []
  const unsubscribe = session.subscribeSession(() => snapshots.push(session.getSession()))
  const token = tokenFor()
  session.setSessionToken(token)
  assert.equal(values.get(storageKey), token)
  session.setSessionToken(null, 'Session expired')
  assert.deepEqual(cacheOperations, ['cancel', 'clear', 'cancel', 'clear'])
  assert.deepEqual(snapshots.map(value => value.version), [1, 2])
  assert.deepEqual(session.getSession(), { token: null, version: 2, message: 'Session expired' })
  assert.equal(values.has(storageKey), false)
  unsubscribe()
  session.setSessionToken(token)
  assert.equal(snapshots.length, 2)
})

test('session remains usable in memory when browser storage is unavailable', () => {
  const { session } = createHarness({ storageUnavailable: true })
  const token = tokenFor()
  session.setSessionToken(token)
  assert.equal(session.getSession().token, token)
  session.setSessionToken(null)
  assert.equal(session.getSession().token, null)
})

test('session switch aborts a real TanStack query and prevents a late result restoring private cache', async () => {
  const { isCancelledError } = require('@tanstack/react-query')
  const { queryClient } = loadSource('services/queryClient.ts')
  const { session } = createHarness({ queryClient })
  let finishRequest
  let requestSignal
  const pending = queryClient.fetchQuery({
    queryKey: ['events', 'previous-organization'],
    // Node has no browser lifecycle; avoid a garbage-collection timer keeping
    // the test runner alive after the deliberately late request settles.
    gcTime: Infinity,
    queryFn: ({ signal }) => {
      requestSignal = signal
      return new Promise(resolve => { finishRequest = resolve })
    },
  })
  const rejected = assert.rejects(pending, error => isCancelledError(error))
  session.setSessionToken(tokenFor('next-user'))
  await rejected
  assert.equal(requestSignal.aborted, true)
  finishRequest([{ title: 'Previous private result' }])
  await Promise.resolve()
  assert.equal(queryClient.getQueryCache().getAll().length, 0)
  queryClient.clear()
})

test('authenticated API requests preserve real paths, bearer headers, abort signal, and omit cookies', async () => {
  const { session, api, network } = createHarness()
  const token = tokenFor()
  session.setSessionToken(token)
  const controller = new AbortController()
  let request
  network.fetch = async (url, options) => { request = { url, options }; return jsonResponse([]) }
  const path = '/api/v1/events?organization_id=org-fixture&page=1&page_size=10'
  assert.deepEqual(await api.apiRequest(path, { signal: controller.signal }), [])
  assert.equal(request.url, `/backend${path}`)
  assert.equal(request.options.headers.Authorization, `Bearer ${token}`)
  assert.equal(request.options.headers.Accept, 'application/json')
  assert.equal(request.options.headers['Content-Type'], undefined)
  assert.equal(request.options.credentials, 'omit')
  assert.equal(request.options.redirect, 'error')
  assert.equal(request.options.signal, controller.signal)
})

test('login sends JSON to the real auth path without an existing bearer token', async () => {
  const { session, api, network } = createHarness()
  session.setSessionToken(tokenFor('already-signed-in'))
  let request
  network.fetch = async (url, options) => { request = { url, options }; return jsonResponse({ access_token: 'fixture', token_type: 'bearer' }) }
  const credentials = { email: 'synthetic@example.invalid', password: 'test-only-placeholder' }
  await api.apiRequest('/auth/login', { method: 'POST', body: credentials, auth: false })
  assert.equal(request.url, '/backend/auth/login')
  assert.equal(request.options.method, 'POST')
  assert.equal(request.options.headers.Authorization, undefined)
  assert.equal(request.options.headers['Content-Type'], 'application/json')
  assert.deepEqual(JSON.parse(request.options.body), credentials)
  assert.equal(request.options.credentials, 'omit')
})

test('explicit API base URL is supported without a duplicate trailing slash', async () => {
  const { api, network } = createHarness({ baseUrl: 'https://api.example.invalid/' })
  let actualUrl
  network.fetch = async url => { actualUrl = url; return jsonResponse({}) }
  await api.apiRequest('/auth/me')
  assert.equal(actualUrl, 'https://api.example.invalid/auth/me')
})

test('a 401 for the current bearer token clears the session and supplies an expiry message', async () => {
  const { session, api, network, values } = createHarness()
  session.setSessionToken(tokenFor())
  network.fetch = async () => jsonResponse({ detail: 'Invalid or missing authentication token' }, 401)
  await assert.rejects(api.apiRequest('/auth/me'), error => error instanceof api.ApiError && error.status === 401)
  assert.equal(session.getSession().token, null)
  assert.match(session.getSession().message, /expired.*sign in/i)
  assert.equal(values.has(storageKey), false)
})

test('a late 401 from an earlier session cannot sign out the current user', async () => {
  const { session, api, network } = createHarness()
  session.setSessionToken(tokenFor('previous-user'))
  let finishRequest
  network.fetch = () => new Promise(resolve => { finishRequest = resolve })
  const pending = api.apiRequest('/auth/me')
  const rejected = assert.rejects(pending, error => error.status === 401)
  const currentToken = tokenFor('current-user')
  session.setSessionToken(currentToken)
  finishRequest(jsonResponse({ detail: 'Invalid token' }, 401))
  await rejected
  assert.equal(session.getSession().token, currentToken)
  assert.equal(session.getSession().message, null)
})

test('failed login does not clear an existing authenticated session', async () => {
  const { session, api, network } = createHarness()
  const currentToken = tokenFor()
  session.setSessionToken(currentToken)
  network.fetch = async () => jsonResponse({ detail: 'Invalid email or password' }, 401)
  await assert.rejects(api.apiRequest('/auth/login', { method: 'POST', body: {}, auth: false }), /Invalid email or password/)
  assert.equal(session.getSession().token, currentToken)
})

test('FastAPI validation details become field-specific errors without losing the HTTP status', async () => {
  const { api, network } = createHarness()
  network.fetch = async () => jsonResponse({ detail: [
    { loc: ['body', 'title'], msg: 'Field required' },
    { loc: ['query', 'page'], msg: 'Input should be greater than or equal to 1' },
  ] }, 422)
  await assert.rejects(api.apiRequest('/api/v1/events', { method: 'POST', body: {} }), error => {
    assert.ok(error instanceof api.ApiError)
    assert.equal(error.status, 422)
    assert.equal(error.message, 'title: Field required. page: Input should be greater than or equal to 1')
    return true
  })
})

test('network failures are readable while cancellation stays an AbortError', async () => {
  const { api, network } = createHarness()
  network.fetch = async () => { throw new TypeError('Connection refused') }
  await assert.rejects(api.apiRequest('/health'), /Unable to reach FieldOps Pro/)
  const aborted = new DOMException('Aborted', 'AbortError')
  network.fetch = async () => { throw aborted }
  await assert.rejects(api.apiRequest('/health'), error => error === aborted)
})

test('HTML or empty success responses are rejected instead of being used as API data', async () => {
  const { api, network } = createHarness()
  network.fetch = async () => new Response('<html>wrong server</html>', { status: 200 })
  await assert.rejects(api.apiRequest('/organizations'), error => error instanceof api.ApiError && error.status === 502)
  network.fetch = async () => new Response(null, { status: 204 })
  assert.equal(await api.apiRequest('/no-content'), null)
})

const { eventFormSchema, toEventCreate } = loadSource('features/events/schema.ts')
const validEvent = () => ({
  title: '  Team planning day  ', description: '  Bring your team.  ', location: '  Main hall  ',
  start_at: '2026-11-05T09:00', end_at: '2026-11-05T10:30', capacity: '25',
})

test('event form produces the existing backend fields with trimmed values and timezone-aware instants', () => {
  const values = eventFormSchema.parse(validEvent())
  const payload = toEventCreate(values, 'organization-fixture')
  assert.deepEqual(payload, {
    organization_id: 'organization-fixture', title: 'Team planning day',
    description: 'Bring your team.', location: 'Main hall', capacity: 25,
    start_at: new Date('2026-11-05T09:00').toISOString(),
    end_at: new Date('2026-11-05T10:30').toISOString(),
  })
  assert.match(payload.start_at, /Z$/)
  assert.match(payload.end_at, /Z$/)
  assert.equal(Object.hasOwn(payload, 'status'), false)
})

test('blank optional event fields serialize as null, including an unlimited capacity', () => {
  const values = eventFormSchema.parse({ ...validEvent(), description: ' ', location: ' ', capacity: '' })
  const payload = toEventCreate(values, 'organization-fixture')
  assert.equal(payload.description, null)
  assert.equal(payload.location, null)
  assert.equal(payload.capacity, null)
})

test('event validation rejects invalid calendar dates and non-increasing schedules', () => {
  for (const changes of [
    { start_at: '' }, { start_at: '2026-02-30T09:00' }, { start_at: 'not-a-date' },
    { end_at: '2026-11-05T09:00' }, { end_at: '2026-11-04T09:00' },
  ]) {
    assert.equal(eventFormSchema.safeParse({ ...validEvent(), ...changes }).success, false, JSON.stringify(changes))
  }
})

test('event validation enforces backend text and PostgreSQL integer capacity boundaries', () => {
  for (const changes of [
    { title: '   ' }, { title: 'x'.repeat(151) }, { description: 'x'.repeat(1001) },
    { location: 'x'.repeat(201) }, ...['0', '-1', '1.5', 'abc', '2147483648'].map(capacity => ({ capacity })),
  ]) {
    assert.equal(eventFormSchema.safeParse({ ...validEvent(), ...changes }).success, false)
  }
  assert.equal(eventFormSchema.safeParse({ ...validEvent(), capacity: '2147483647' }).success, true)
})
