import { useQuery } from '@tanstack/react-query'
import { apiRequest } from '../../services/api'
import type { EventRecord } from '../../types/api'

export const eventKeys = {
  organization: (organizationId: string) => ['events', organizationId] as const,
  list: (organizationId: string, options: EventListOptions) =>
    ['events', organizationId, 'list', options] as const,
  detail: (organizationId: string, eventId: string) =>
    ['events', organizationId, 'detail', eventId] as const,
}

export interface EventListOptions {
  page?: number
  pageSize?: number
  search?: string
  status?: string
}

export function useEvents(organizationId: string | undefined, options: EventListOptions = {}) {
  const { page = 1, pageSize = 10, search = '', status = '' } = options
  return useQuery({
    queryKey: eventKeys.list(organizationId ?? '', { page, pageSize, search, status }),
    enabled: Boolean(organizationId),
    queryFn: ({ signal }) => {
      const params = new URLSearchParams({
        organization_id: organizationId!,
        page: String(page),
        page_size: String(pageSize),
      })
      if (search.trim()) params.set('search', search.trim())
      if (status) params.set('status_filter', status)
      return apiRequest<EventRecord[]>(`/api/v1/events?${params}`, { signal })
    },
  })
}

export function useEvent(organizationId: string | undefined, eventId: string, enabled = true) {
  return useQuery({
    queryKey: eventKeys.detail(organizationId ?? '', eventId),
    enabled: Boolean(organizationId) && enabled,
    queryFn: async ({ signal }) => {
      const event = await apiRequest<EventRecord>(`/api/v1/events/${encodeURIComponent(eventId)}`, { signal })
      if (event.organization_id !== organizationId) {
        throw new Error('This event is not available in the selected organization. Switch organizations or return to the event list.')
      }
      return event
    },
  })
}
