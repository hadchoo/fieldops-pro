import { useQuery } from '@tanstack/react-query'
import { apiRequest } from '../../services/api'
import type { Registration, RegistrationCreate } from './types'

export const registrationKeys = {
  organization: (organizationId: string) => ['registrations', organizationId] as const,
  event: (organizationId: string, eventId: string) => ['registrations', organizationId, eventId] as const,
}

export function useRegistrations(organizationId: string | undefined, eventId: string | undefined) {
  return useQuery({
    queryKey: registrationKeys.event(organizationId ?? '', eventId ?? ''),
    enabled: Boolean(organizationId && eventId),
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({ event_id: eventId! })
      const registrations = await apiRequest<Registration[]>(`/api/v1/registrations?${params}`, { signal })
      if (registrations.some(registration => registration.event_id !== eventId)) {
        throw new Error('The registration list does not match the selected event. Please refresh the event.')
      }
      return registrations
    },
  })
}

export function createRegistration(payload: RegistrationCreate) {
  return apiRequest<Registration>('/api/v1/registrations', { method: 'POST', body: payload })
}

export function markRegistrationAttendance(registrationId: string) {
  return apiRequest<Registration>(`/api/v1/registrations/${encodeURIComponent(registrationId)}/attendance`, { method: 'PATCH' })
}

export function cancelRegistration(registrationId: string) {
  return apiRequest<Registration>(`/api/v1/registrations/${encodeURIComponent(registrationId)}/cancel`, { method: 'PATCH' })
}
