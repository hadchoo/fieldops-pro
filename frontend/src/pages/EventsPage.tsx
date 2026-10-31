import { ChevronLeft, ChevronRight, Plus, RefreshCw, Search } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button, Card, EmptyState, ErrorState, LoadingState, PageHeader } from '../components/ui'
import { buttonClassName, inputClassName } from '../components/ui/styles'
import EventList from '../features/events/EventList'
import { eventStatuses, localTimeZone, statusLabel } from '../features/events/format'
import { useEvents } from '../features/events/queries'
import { useOrganization } from '../features/organizations/useOrganization'

const pageSize = 10

export default function EventsPage() {
  const { organization, canManageEvents } = useOrganization()
  const [params, setParams] = useSearchParams()
  const search = (params.get('search') ?? '').slice(0, 100)
  const rawStatus = params.get('status') ?? ''
  const status = eventStatuses.some((value) => value === rawStatus) ? rawStatus : ''
  const rawPage = Number(params.get('page') ?? 1)
  const page = Number.isSafeInteger(rawPage) && rawPage >= 1 ? rawPage : 1
  const eventsQuery = useEvents(organization?.id, { page, pageSize, search, status })
  const events = eventsQuery.data ?? []

  function updateFilters(values: Record<string, string>) {
    const next = new URLSearchParams(params)
    Object.entries(values).forEach(([key, value]) => {
      if (value) next.set(key, value)
      else next.delete(key)
    })
    setParams(next)
  }

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Plan & coordinate"
        title="Events"
        description={`The event schedule for ${organization?.name ?? 'your organization'}.`}
        action={canManageEvents ? <Link className={buttonClassName()} to="/events/new"><Plus size={17} aria-hidden="true" />Create event</Link> : undefined}
      />
      {!canManageEvents && <p className="text-sm text-slate-500">You can browse events. An organization Owner or Admin can create them.</p>}
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:p-5 lg:flex-row lg:items-end">
          <form
            key={search}
            className="flex flex-1 items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              const form = new FormData(event.currentTarget)
              updateFilters({ search: String(form.get('search') ?? '').trim(), page: '' })
            }}
            role="search"
            aria-label="Search events"
          >
            <div className="min-w-0 flex-1">
              <label htmlFor="event-search" className="mb-1.5 block text-sm font-medium text-slate-700">Search by name</label>
              <input id="event-search" name="search" type="search" maxLength={100} defaultValue={search} placeholder="Find an event…" className={inputClassName} />
            </div>
            <Button variant="secondary" type="submit"><Search size={16} aria-hidden="true" /><span className="sr-only sm:not-sr-only">Search</span></Button>
          </form>
          <div className="flex items-end gap-2">
            <div className="min-w-0 flex-1 lg:w-44">
              <label htmlFor="event-status" className="mb-1.5 block text-sm font-medium text-slate-700">Status</label>
              <select id="event-status" value={status} onChange={(event) => updateFilters({ status: event.target.value, page: '' })} className={inputClassName}>
                <option value="">All statuses</option>
                {eventStatuses.map((value) => <option key={value} value={value}>{statusLabel(value)}</option>)}
              </select>
            </div>
            <Button variant="ghost" aria-label="Refresh events" title="Refresh events" disabled={eventsQuery.isFetching} onClick={() => void eventsQuery.refetch()}><RefreshCw size={17} className={eventsQuery.isFetching ? 'animate-spin' : ''} aria-hidden="true" /></Button>
          </div>
        </div>
        {eventsQuery.isPending ? <LoadingState label="Loading events…" /> : eventsQuery.isError ? <ErrorState error={eventsQuery.error} onRetry={() => void eventsQuery.refetch()} /> : events.length ? <EventList events={events} /> : (
          <EmptyState
            title={page > 1 ? 'You’ve reached the end' : search || status ? 'No matching events' : 'Your next event starts here'}
            description={page > 1 ? 'There are no events on this page. Return to the previous page to see more.' : search || status ? 'Try another name or clear the filters to see more events.' : 'Keep plans, dates, and event details together in your organization’s workspace.'}
            action={page > 1 ? <Button variant="secondary" onClick={() => updateFilters({ page: String(page - 1) })}>Previous page</Button> : search || status ? <Button variant="secondary" onClick={() => setParams({})}>Clear filters</Button> : canManageEvents ? <Link className={buttonClassName()} to="/events/new">Create your first event</Link> : undefined}
          />
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-4 sm:px-6">
          <p className="text-sm text-slate-500" aria-live="polite">Page {page}{eventsQuery.isSuccess ? ` · ${events.length} ${events.length === 1 ? 'event' : 'events'} shown` : ''}</p>
          <div className="flex gap-2" aria-label="Event pagination">
            <Button variant="secondary" disabled={page <= 1 || eventsQuery.isFetching} onClick={() => updateFilters({ page: String(page - 1) })}><ChevronLeft size={15} aria-hidden="true" />Previous</Button>
            <Button variant="secondary" disabled={events.length < pageSize || eventsQuery.isFetching || eventsQuery.isError} onClick={() => updateFilters({ page: String(page + 1) })}>Next<ChevronRight size={15} aria-hidden="true" /></Button>
          </div>
        </div>
      </Card>
      <p className="text-xs leading-5 text-slate-400">Sorted by start date, earliest first. Dates are shown in {localTimeZone}. Archived events are excluded.</p>
    </div>
  )
}
