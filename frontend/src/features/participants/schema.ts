import { z } from 'zod'

export const participantFormSchema = z.object({
  full_name: z.string().trim().min(1, 'Enter the participant’s full name.').max(150, 'Use 150 characters or fewer.'),
})

export type ParticipantFormValues = z.infer<typeof participantFormSchema>
