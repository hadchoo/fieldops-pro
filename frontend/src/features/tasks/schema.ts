import { z } from 'zod'
import type { TaskFields, TaskRecord } from './types'
import { taskPriorities } from './types'

function isLocalDateTime(value: string) {
  if (value === '') return true
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(value)) return false
  const date = new Date(value)
  const [year, month, day, hour, minute, second = 0] = value.split(/[-T:]/).map(Number)
  return Number.isFinite(date.getTime()) && date.getFullYear() === year && date.getMonth() + 1 === month
    && date.getDate() === day && date.getHours() === hour && date.getMinutes() === minute && date.getSeconds() === second
}

export const taskFormSchema = z.object({
  title: z.string().trim().min(1, 'Enter a task name.').max(150, 'Use 150 characters or fewer.'),
  description: z.string(),
  priority: z.enum(taskPriorities, { error: 'Choose low, medium, or high priority.' }),
  due_at: z.string().refine(isLocalDateTime, 'Enter a valid local date and time, or leave blank.'),
})
export type TaskFormValues = z.infer<typeof taskFormSchema>
export const taskAssignmentSchema = z.object({ user_id: z.uuid('Choose an active organization member.') })
export type TaskAssignmentValues = z.infer<typeof taskAssignmentSchema>

export function toTaskFields(values: TaskFormValues): TaskFields {
  return {
    title: values.title,
    description: values.description.trim() || null,
    priority: values.priority,
    due_at: values.due_at ? new Date(values.due_at).toISOString() : null,
  }
}

function toLocalInput(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return ''
  const pad = (number: number) => String(number).padStart(2, '0')
  return `${String(date.getFullYear()).padStart(4, '0')}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

export function taskFormDefaults(task?: TaskRecord): TaskFormValues {
  return {
    title: task?.title ?? '',
    description: task?.description ?? '',
    priority: task?.priority ?? 'medium',
    due_at: toLocalInput(task?.due_at ?? null),
  }
}
