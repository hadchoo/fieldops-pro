/** Existing ParticipantRead / ParticipantCreate contracts. */
export interface Participant {
  id: string
  organization_id: string
  full_name: string
  created_at: string
}

export interface ParticipantCreate {
  organization_id: string
  full_name: string
}
