import { z } from 'zod'
import type { EventCreate } from '../../types/api'

function isLocalDateTime(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return false
  const date = new Date(value)
  const [year, month, day, hour, minute] = value.split(/[-T:]/).map(Number)
  return Number.isFinite(date.getTime()) && date.getFullYear() === year && date.getMonth() + 1 === month
    && date.getDate() === day && date.getHours() === hour && date.getMinutes() === minute
}

const localDateTime = z.string().min(1, 'Choose a date and time.').refine(
  isLocalDateTime,
  'Enter a valid date and time.',
)

export const eventFormSchema = z.object({
  title: z.string().trim().min(1, 'Enter an event name.').max(150, 'Use 150 characters or fewer.'),
  description: z.string().trim().max(1000, 'Use 1,000 characters or fewer.'),
  location: z.string().trim().max(200, 'Use 200 characters or fewer.'),
  start_at: localDateTime,
  end_at: localDateTime,
  capacity: z.string().trim().refine(
    (value) => value === '' || (/^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= 2147483647),
    'Enter a whole number between 1 and 2,147,483,647, or leave blank.',
  ),
}).refine(
  (values) => new Date(values.end_at).getTime() > new Date(values.start_at).getTime(),
  { message: 'The end must be after the start.', path: ['end_at'] },
)

export type EventFormValues = z.infer<typeof eventFormSchema>

export function toEventCreate(values: EventFormValues, organizationId: string): EventCreate {
  return {
    organization_id: organizationId,
    title: values.title,
    description: values.description || null,
    location: values.location || null,
    start_at: new Date(values.start_at).toISOString(),
    end_at: new Date(values.end_at).toISOString(),
    capacity: values.capacity === '' ? null : Number(values.capacity),
  }
}
