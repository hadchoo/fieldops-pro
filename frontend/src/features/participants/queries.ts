import { useQuery } from '@tanstack/react-query'
import { apiRequest } from '../../services/api'
import type { Participant, ParticipantCreate } from './types'

export const participantKeys = {
  organization: (organizationId: string) => ['participants', organizationId] as const,
  list: (organizationId: string) => ['participants', organizationId, 'list'] as const,
}

export function useParticipants(organizationId: string | undefined) {
  return useQuery({
    queryKey: participantKeys.list(organizationId ?? ''),
    enabled: Boolean(organizationId),
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({ organization_id: organizationId! })
      const participants = await apiRequest<Participant[]>(`/api/v1/participants?${params}`, { signal })
      if (participants.some(participant => participant.organization_id !== organizationId)) {
        throw new Error('The participant list does not match your selected organization. Please refresh your workspace.')
      }
      return participants
    },
  })
}

export function createParticipant(payload: ParticipantCreate) {
  return apiRequest<Participant>('/api/v1/participants', { method: 'POST', body: payload })
}
