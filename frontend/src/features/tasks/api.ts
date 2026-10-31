import { apiRequest } from '../../services/api'
import type { TaskAssignment, TaskCreate, TaskFields, TaskRecord, TaskStatus } from './types'

export async function fetchTasks(eventId: string, signal: AbortSignal) {
  const params = new URLSearchParams({ event_id: eventId })
  const tasks = await apiRequest<TaskRecord[]>(`/api/v1/tasks?${params}`, { signal })
  if (tasks.some(task => task.event_id !== eventId)) throw new Error('The task response does not belong to the selected event.')
  return tasks
}

export const createTask = (payload: TaskCreate) => apiRequest<TaskRecord>('/api/v1/tasks', { method: 'POST', body: payload })
export const updateTask = (taskId: string, payload: TaskFields) => apiRequest<TaskRecord>(`/api/v1/tasks/${encodeURIComponent(taskId)}`, { method: 'PATCH', body: payload })
export const updateTaskStatus = (taskId: string, status: TaskStatus) => apiRequest<TaskRecord>(`/api/v1/tasks/${encodeURIComponent(taskId)}/status`, { method: 'PATCH', body: { status } })

export async function fetchTaskAssignments(taskId: string, signal: AbortSignal) {
  const params = new URLSearchParams({ task_id: taskId })
  const assignments = await apiRequest<TaskAssignment[]>(`/api/v1/task-assignments?${params}`, { signal })
  if (assignments.some(assignment => assignment.task_id !== taskId)) throw new Error('The assignment response does not belong to this task.')
  return assignments
}

export const assignTask = (taskId: string, userId: string) => apiRequest<TaskAssignment>('/api/v1/task-assignments', { method: 'POST', body: { task_id: taskId, user_id: userId } })
export const removeTaskAssignment = (assignmentId: string) => apiRequest<void>(`/api/v1/task-assignments/${encodeURIComponent(assignmentId)}`, { method: 'DELETE' })
