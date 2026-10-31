import { queryClient } from './queryClient'

const storageKey = 'fieldops.access-token'
type Session = { token: string | null; version: number; message: string | null }
const listeners = new Set<() => void>()

export function tokenExpiresAt(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return typeof payload.exp === 'number' && Number.isFinite(payload.exp) ? payload.exp * 1000 : null
  } catch {
    return null
  }
}

function readToken(): string | null {
  try {
    const token = sessionStorage.getItem(storageKey)
    if (token && (tokenExpiresAt(token) ?? 0) > Date.now()) return token
    sessionStorage.removeItem(storageKey)
  } catch { /* Storage can be disabled. The session still works in memory. */ }
  return null
}

let session: Session = { token: readToken(), version: 0, message: null }

export const getSession = () => session
export function subscribeSession(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export function setSessionToken(token: string | null, message: string | null = null) {
  // Cancel before clearing so requests from a previous session cannot repopulate its data.
  void queryClient.cancelQueries()
  queryClient.clear()
  try {
    if (token) sessionStorage.setItem(storageKey, token)
    else sessionStorage.removeItem(storageKey)
  } catch { /* Keep tokens in memory when session storage is unavailable. */ }
  session = { token, version: session.version + 1, message }
  listeners.forEach(listener => listener())
}
