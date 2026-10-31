import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { useId } from 'react'
import { useForm } from 'react-hook-form'
import { Button, Field } from '../../components/ui'
import { inputClassName } from '../../components/ui/styles'
import { useScopedMutation } from '../../hooks/useScopedMutation'
import { getErrorMessage } from '../../services/api'
import { localTimeZone } from '../events/format'
import { useOrganization } from '../organizations/useOrganization'
import { createTask, updateTask } from './api'
import { taskKeys } from './queries'
import { taskFormDefaults, taskFormSchema, toTaskFields } from './schema'
import type { TaskFormValues } from './schema'
import { taskLabel, taskPriorities } from './types'
import type { TaskRecord } from './types'

export default function TaskForm({ eventId, task, onSaved, onCancel }: {
  eventId: string
  task?: TaskRecord
  onSaved: (message: string) => void
  onCancel: () => void
}) {
  const { organization, canManageEvents } = useOrganization()
  const queryClient = useQueryClient()
  const fieldId = useId()
  const defaults = taskFormDefaults(task)
  const { register, handleSubmit, formState: { errors } } = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: defaults,
  })
  const mutation = useScopedMutation<TaskRecord, TaskFormValues>({
    mutationFn: (values) => {
      if (!canManageEvents || !organization) throw new Error('Only an active Owner or Admin can manage tasks.')
      const payload = toTaskFields(values)
      // Preserve the original instant, including subsecond precision, when the
      // due date is unchanged while another task field is edited.
      if (task && values.due_at === defaults.due_at) payload.due_at = task.due_at
      return task ? updateTask(task.id, payload) : createTask({ event_id: eventId, ...payload })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: taskKeys.event(organization!.id, eventId) })
      onSaved(task ? 'Task updated.' : 'Task created.')
    },
  })

  return <form noValidate onSubmit={handleSubmit(values => mutation.mutate(values))} className="space-y-5 rounded-xl border border-teal-100 bg-teal-50/40 p-4 sm:p-5">
    <h3 className="font-semibold text-slate-900">{task ? 'Edit task' : 'Create task'}</h3>
    {mutation.isError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-800">{getErrorMessage(mutation.error)}</p>}
    <fieldset disabled={mutation.isPending} className="space-y-5 disabled:opacity-70">
      <legend className="sr-only">Task information</legend>
      <Field htmlFor={`${fieldId}-title`} label="Task name *" error={errors.title?.message}>
        <input id={`${fieldId}-title`} required maxLength={150} className={inputClassName} aria-invalid={Boolean(errors.title)} aria-describedby={errors.title ? `${fieldId}-title-error` : undefined} {...register('title')} />
      </Field>
      <Field htmlFor={`${fieldId}-description`} label="Description" error={errors.description?.message}>
        <textarea id={`${fieldId}-description`} rows={3} className={`${inputClassName} resize-y`} aria-invalid={Boolean(errors.description)} aria-describedby={errors.description ? `${fieldId}-description-error` : undefined} {...register('description')} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field htmlFor={`${fieldId}-priority`} label="Priority *" error={errors.priority?.message}>
          <select id={`${fieldId}-priority`} className={inputClassName} required aria-invalid={Boolean(errors.priority)} aria-describedby={errors.priority ? `${fieldId}-priority-error` : undefined} {...register('priority')}>
            {taskPriorities.map(priority => <option key={priority} value={priority}>{taskLabel(priority)}</option>)}
          </select>
        </Field>
        <Field htmlFor={`${fieldId}-due`} label="Due at" error={errors.due_at?.message} hint={`Optional · ${localTimeZone}. Leave blank for no due date.`}>
          <input id={`${fieldId}-due`} type="datetime-local" step={1} className={inputClassName} aria-invalid={Boolean(errors.due_at)} aria-describedby={`${fieldId}-due-hint${errors.due_at ? ` ${fieldId}-due-error` : ''}`} {...register('due_at')} />
        </Field>
      </div>
    </fieldset>
    <div className="flex flex-wrap justify-end gap-2 border-t border-teal-100 pt-4">
      <Button variant="secondary" onClick={onCancel} disabled={mutation.isPending}>Cancel</Button>
      <Button type="submit" busy={mutation.isPending}>{mutation.isPending ? 'Saving…' : task ? 'Save changes' : 'Create task'}</Button>
    </div>
  </form>
}
