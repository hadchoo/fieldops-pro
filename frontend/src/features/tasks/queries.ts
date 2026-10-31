import { useQuery } from '@tanstack/react-query'
import { apiRequest } from '../../services/api'
import type { Membership } from '../../types/api'
import { useAuth } from '../auth/useAuth'
import { useOrganization } from '../organizations/useOrganization'
import { fetchTaskAssignments, fetchTasks } from './api'

export const taskKeys = {
  event: (organizationId: string, eventId: string) => ['tasks', organizationId, eventId] as const,
  assignments: (organizationId: string, eventId: string, taskId: string) => ['task-assignments', organizationId, eventId, taskId] as const,
}

export function useTasks(organizationId: string, eventId: string, enabled = true) {
  return useQuery({
    queryKey: taskKeys.event(organizationId, eventId),
    enabled: Boolean(organizationId && eventId) && enabled,
    queryFn: ({ signal }) => fetchTasks(eventId, signal),
  })
}

export function useTaskAssignments(organizationId: string, eventId: string, taskId: string) {
  return useQuery({
    queryKey: taskKeys.assignments(organizationId, eventId, taskId),
    enabled: Boolean(organizationId && eventId && taskId),
    queryFn: ({ signal }) => fetchTaskAssignments(taskId, signal),
  })
}

export function useTaskMembers() {
  const { user } = useAuth()
  const { organization } = useOrganization()
  return useQuery({
    queryKey: ['organization-members', user?.id, organization?.id],
    enabled: Boolean(user && organization),
    queryFn: ({ signal }) => apiRequest<Membership[]>(`/organizations/${encodeURIComponent(organization!.id)}/members`, { signal }),
  })
}
