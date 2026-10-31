/** Existing RegistrationRead / RegistrationCreate contracts. */
export interface Registration {
  id: string
  event_id: string
  participant_id: string
  status: 'registered' | 'cancelled'
  attended_at: string | null
  fee_required: boolean
  payment_status: 'unpaid' | 'partial' | 'paid' | null
  created_at: string
}

export interface RegistrationCreate {
  event_id: string
  participant_id: string
  fee_required?: boolean
}
