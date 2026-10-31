import type { EventRecord } from '../../types/api'
import type { Participant } from '../participants/types'
import type { Registration } from './types'

export function acceptsRegistrations(event: Pick<EventRecord, 'status' | 'archived_at'>) {
  return !event.archived_at && (event.status === 'planned' || event.status === 'active')
}

export function canMarkAttendance(event: Pick<EventRecord, 'status' | 'archived_at'>, registration: Registration) {
  return !event.archived_at && event.status === 'active' && registration.status === 'registered' && !registration.attended_at
}

export function canCancelRegistration(registration: Registration) {
  return registration.status === 'registered' && !registration.attended_at
}

export function availableParticipants(participants: Participant[], registrations: Registration[]) {
  // The backend has a permanent event+participant uniqueness rule, including cancelled rows.
  const registeredIds = new Set(registrations.map(registration => registration.participant_id))
  return participants.filter(participant => !registeredIds.has(participant.id))
}
