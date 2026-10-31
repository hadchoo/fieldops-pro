import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Button, ErrorState, LoadingState } from '../../components/ui'
import { useAuth } from './useAuth'

export function ProtectedRoute() {
  const auth = useAuth()
  const location = useLocation()
  if (!auth.hasSession) return <Navigate to="/login" replace state={{ from: location.pathname + location.search + location.hash }} />
  if (auth.isLoading) return <main className="grid min-h-svh place-items-center"><LoadingState label="Restoring your session…" /></main>
  if (auth.error || !auth.user) return (
    <main className="mx-auto max-w-xl px-6 py-24">
      <ErrorState title="We couldn't verify your session" error={auth.error} onRetry={auth.retry} />
      <div className="mt-4 text-center"><Button variant="secondary" onClick={auth.logout}>Return to sign in</Button></div>
    </main>
  )
  return <Outlet />
}
