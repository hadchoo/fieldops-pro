import { useQuery } from '@tanstack/react-query'
import { Activity, ArrowRight, Building2, CalendarDays, Plus, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button, Card, EmptyState, ErrorState, LoadingState, PageHeader } from '../components/ui'
import { buttonClassName } from '../components/ui/styles'
import { useAuth } from '../features/auth/useAuth'
import EventList from '../features/events/EventList'
import { localTimeZone } from '../features/events/format'
import { useEvents } from '../features/events/queries'
import { useOrganization } from '../features/organizations/useOrganization'
import { apiRequest } from '../services/api'

export default function DashboardPage() {
  const { user } = useAuth()
  const { organization, membership, canManageEvents } = useOrganization()
  const eventsQuery = useEvents(organization?.id, { pageSize: 6 })
  const healthQuery = useQuery({
    queryKey: ['health'],
    queryFn: ({ signal }) => apiRequest<{ status: string; application: string }>('/health', { signal }),
    staleTime: 30_000,
  })
  const events = eventsQuery.data ?? []

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Workspace overview"
        title="Dashboard"
        description={`Welcome back${user?.name ? `, ${user.name}` : ''}. Here’s what’s happening in ${organization?.name ?? 'your organization'}.`}
        action={canManageEvents ? <Link to="/events/new" className={buttonClassName()}><Plus size={17} aria-hidden="true" />Create event</Link> : undefined}
      />
      <section className="relative overflow-hidden rounded-2xl bg-slate-900 px-6 py-7 text-white sm:px-8 sm:py-8" aria-label="Organization workspace">
        <div className="pointer-events-none absolute -right-14 -top-24 size-72 rounded-full border-[45px] border-white/5" aria-hidden="true" />
        <div className="relative max-w-xl">
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-teal-300"><span className="size-1.5 rounded-full bg-teal-400" aria-hidden="true" />Your team’s workspace</span>
          <h2 className="mt-3 break-words text-2xl font-semibold tracking-tight sm:text-3xl">{organization?.name}</h2>
          <p className="mt-3 text-sm leading-7 text-slate-300">Bring every plan into focus. Find your organization’s events, check the details, and keep your team moving together.</p>
          <Link to="/events" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-teal-300 hover:text-teal-200">Explore events<ArrowRight size={16} aria-hidden="true" /></Link>
        </div>
      </section>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:px-6">
            <div><h2 className="font-semibold text-slate-900">Event schedule</h2><p className="mt-1 text-xs leading-5 text-slate-500">A preview of the first six events by start date.</p></div>
            <Link to="/events" className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-700 hover:text-teal-900">View all<ArrowRight size={15} aria-hidden="true" /></Link>
          </div>
          {eventsQuery.isPending ? <LoadingState label="Loading your event schedule…" /> : eventsQuery.isError ? <ErrorState error={eventsQuery.error} onRetry={() => void eventsQuery.refetch()} /> : events.length ? <EventList events={events} /> : <EmptyState title="A clear schedule, a fresh start" description={canManageEvents ? 'Create your first event to give your team a plan to work toward.' : 'Events will appear here when an Owner or Admin creates them.'} action={canManageEvents ? <Link to="/events/new" className={buttonClassName()}><Plus size={16} aria-hidden="true" />Create an event</Link> : undefined} />}
          <p className="border-t border-slate-100 px-5 py-3 text-xs leading-5 text-slate-400 sm:px-6">Dates shown in {localTimeZone}. This preview excludes archived events.</p>
        </Card>
        <div className="space-y-6">
          <Card className="p-5 sm:p-6">
            <h2 className="font-semibold text-slate-900">Workspace details</h2>
            <dl className="mt-5 space-y-5">
              <div><dt className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-500"><Building2 size={15} aria-hidden="true" />Organization</dt><dd className="mt-2 break-words text-sm font-medium text-slate-800">{organization?.name}</dd></div>
              <div><dt className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-500"><ShieldCheck size={15} aria-hidden="true" />Your role</dt><dd className="mt-2 text-sm font-medium text-slate-800">{membership?.role ?? 'Access unavailable'}</dd></div>
            </dl>
            <p className="mt-5 border-t border-slate-100 pt-4 text-sm leading-6 text-slate-500">{canManageEvents ? 'You can browse and create events for this organization.' : 'You can browse event schedules and details for this organization.'}</p>
          </Card>
          <Card className="p-5 sm:p-6">
            <h2 className="flex items-center gap-2 font-semibold text-slate-900"><Activity size={17} className="text-teal-700" aria-hidden="true" />Service status</h2>
            <div className="mt-4" aria-live="polite">
              {healthQuery.isPending ? <p className="text-sm text-slate-500">Checking connection…</p> : healthQuery.isError ? <><p className="text-sm leading-6 text-rose-700">The service could not be reached.</p><Button variant="ghost" className="mt-2" onClick={() => void healthQuery.refetch()} disabled={healthQuery.isFetching}>Check again</Button></> : <p className="flex items-center gap-2 text-sm text-slate-600"><span className={`size-2 rounded-full ${healthQuery.data.status === 'ok' ? 'bg-teal-500' : 'bg-amber-500'}`} aria-hidden="true" />{healthQuery.data.status === 'ok' ? 'FieldOps Pro is connected' : 'Service needs attention'}</p>}
            </div>
          </Card>
          <div className="flex items-start gap-3 px-1 text-xs leading-6 text-slate-500"><CalendarDays size={17} className="mt-1 shrink-0 text-slate-400" aria-hidden="true" /><p>Switch organizations in the header to see the schedule and permissions for another workspace.</p></div>
        </div>
      </div>
    </div>
  )
}
