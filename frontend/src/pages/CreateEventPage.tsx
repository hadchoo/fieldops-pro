import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CalendarPlus, Info } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Card, EmptyState, Field, PageHeader } from '../components/ui'
import { buttonClassName, inputClassName } from '../components/ui/styles'
import { localTimeZone } from '../features/events/format'
import { eventKeys } from '../features/events/queries'
import { eventFormSchema, toEventCreate } from '../features/events/schema'
import type { EventFormValues } from '../features/events/schema'
import { useOrganization } from '../features/organizations/useOrganization'
import { apiRequest, getErrorMessage } from '../services/api'
import { getSession } from '../services/session'
import type { EventCreate, EventRecord } from '../types/api'

export default function CreateEventPage() {
  const { organization, canManageEvents } = useOrganization()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { register, handleSubmit, formState: { errors } } = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: { title: '', description: '', location: '', start_at: '', end_at: '', capacity: '' },
  })
  const createMutation = useMutation({
    mutationFn: ({ payload, sessionVersion }: { payload: EventCreate; sessionVersion: number }) => {
      if (getSession().version !== sessionVersion) throw new Error('Your session changed. Please sign in again before creating an event.')
      return apiRequest<EventRecord>('/api/v1/events', { method: 'POST', body: payload })
    },
    onSuccess: async (event, { sessionVersion }) => {
      if (getSession().version !== sessionVersion) return
      await queryClient.invalidateQueries({ queryKey: eventKeys.organization(event.organization_id) })
      if (getSession().version === sessionVersion) queryClient.setQueryData(eventKeys.detail(event.organization_id, event.id), event)
    },
  })

  if (!organization || !canManageEvents) {
    return <EmptyState title="Event creation is restricted" description="An active organization Owner or Admin can create events. You can still browse your organization’s event schedule." action={<Link to="/events" className={buttonClassName('secondary')}>Back to events</Link>} />
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link to="/events" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-teal-700"><ArrowLeft size={16} aria-hidden="true" />Back to events</Link>
      <PageHeader eyebrow="Bring your team together" title="Create an event" description={`Add a new event to ${organization.name}. You can start with the essentials.`} />
      <Card>
        <form noValidate onSubmit={handleSubmit((values) => {
          createMutation.mutate({ payload: toEventCreate(values, organization.id), sessionVersion: getSession().version }, {
            onSuccess: (event) => navigate(`/events/${event.id}`, { replace: true, state: { created: true } }),
          })
        })} className="space-y-6 p-5 sm:p-8">
          <div className="flex gap-3 rounded-xl border border-teal-100 bg-teal-50/70 p-4 text-sm leading-6 text-teal-900"><Info size={18} className="mt-0.5 shrink-0" aria-hidden="true" /><p>New events begin with a Planned status. Fields marked with an asterisk (*) are required.</p></div>
          {createMutation.isError && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-800">{getErrorMessage(createMutation.error)}</div>}
          <fieldset disabled={createMutation.isPending} className="space-y-6 disabled:opacity-70">
            <legend className="sr-only">Event information</legend>
            <Field htmlFor="event-title" label="Event name *" error={errors.title?.message}>
              <input id="event-title" required autoComplete="off" maxLength={150} className={inputClassName} placeholder="e.g. Autumn leadership camp" aria-invalid={Boolean(errors.title)} aria-describedby={errors.title ? 'event-title-error' : undefined} {...register('title')} />
            </Field>
            <Field htmlFor="event-description" label="Description" error={errors.description?.message} hint="Optional · up to 1,000 characters.">
              <textarea id="event-description" rows={4} maxLength={1000} className={`${inputClassName} resize-y`} placeholder="What should your team know about this event?" aria-invalid={Boolean(errors.description)} aria-describedby={`event-description-hint${errors.description ? ' event-description-error' : ''}`} {...register('description')} />
            </Field>
            <Field htmlFor="event-location" label="Location" error={errors.location?.message} hint="Optional · up to 200 characters.">
              <input id="event-location" autoComplete="off" maxLength={200} className={inputClassName} placeholder="Venue, meeting point, or online link" aria-invalid={Boolean(errors.location)} aria-describedby={`event-location-hint${errors.location ? ' event-location-error' : ''}`} {...register('location')} />
            </Field>
            <div className="border-t border-slate-100 pt-6">
              <h2 className="font-semibold text-slate-900">Schedule & capacity</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">Enter dates in your local time zone ({localTimeZone}). They will be saved with a time zone.</p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field htmlFor="event-start" label="Starts at *" error={errors.start_at?.message}>
                <input id="event-start" required type="datetime-local" className={inputClassName} aria-invalid={Boolean(errors.start_at)} aria-describedby={errors.start_at ? 'event-start-error' : undefined} {...register('start_at')} />
              </Field>
              <Field htmlFor="event-end" label="Ends at *" error={errors.end_at?.message}>
                <input id="event-end" required type="datetime-local" className={inputClassName} aria-invalid={Boolean(errors.end_at)} aria-describedby={errors.end_at ? 'event-end-error' : undefined} {...register('end_at')} />
              </Field>
            </div>
            <div className="sm:max-w-sm">
              <Field htmlFor="event-capacity" label="Capacity" error={errors.capacity?.message} hint="Optional. Leave blank for no capacity limit.">
                <input id="event-capacity" type="number" min={1} max={2147483647} step={1} inputMode="numeric" className={inputClassName} placeholder="No limit" aria-invalid={Boolean(errors.capacity)} aria-describedby={`event-capacity-hint${errors.capacity ? ' event-capacity-error' : ''}`} {...register('capacity')} />
              </Field>
            </div>
          </fieldset>
          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 pt-6">
            <Link to="/events" className={buttonClassName('secondary')}>Cancel</Link>
            <Button type="submit" busy={createMutation.isPending} disabled={createMutation.isPending}><CalendarPlus size={17} aria-hidden="true" />{createMutation.isPending ? 'Creating event…' : 'Create event'}</Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
