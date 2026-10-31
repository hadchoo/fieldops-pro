import { z } from 'zod'

export const registrationFormSchema = z.object({
  participant_id: z.uuid('Choose an existing participant.'),
  fee_required: z.boolean(),
})

export type RegistrationFormValues = z.infer<typeof registrationFormSchema>
