export const taskPriorities = ['low', 'medium', 'high'] as const
export const taskStatuses = ['todo', 'in_progress', 'done'] as const
export type TaskPriority = typeof taskPriorities[number]
export type TaskStatus = typeof taskStatuses[number]

export interface TaskRecord {
  id: string
  event_id: string
  title: string
  description: string | null
  priority: TaskPriority
  status: TaskStatus
  due_at: string | null
  created_at: string
}

export interface TaskFields {
  title: string
  description: string | null
  priority: TaskPriority
  due_at: string | null
}

export interface TaskCreate extends TaskFields { event_id: string }

export interface TaskAssignment {
  id: string
  task_id: string
  user_id: string
  created_at: string
}

export function taskLabel(value: string) {
  return value.replaceAll('_', ' ').replace(/^./, char => char.toUpperCase())
}

export function canChangeTaskStatus(role: string | undefined, userId: string | undefined, assignments: TaskAssignment[]) {
  if (!role || !userId || role === 'Viewer') return false
  return role === 'Owner' || role === 'Admin' || assignments.some(assignment => assignment.user_id === userId)
}
