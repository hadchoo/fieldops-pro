import { useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiRequest } from '../../services/api'
import { queryClient } from '../../services/queryClient'
import type { Membership, Organization } from '../../types/api'
import { useAuth } from '../auth/useAuth'
import { OrganizationContext } from './organizationContext'

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const storageKey = `fieldops.organization.${user!.id}`
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    try { return sessionStorage.getItem(storageKey) } catch { return null }
  })
  const organizationsQuery = useQuery({
    queryKey: ['organizations', user!.id],
    queryFn: ({ signal }) => apiRequest<Organization[]>('/organizations', { signal }),
  })
  const organizations = organizationsQuery.data ?? []
  // Persisted choices are preferences only; membership is always checked against the API.
  const organization = organizations.find(org => org.id === selectedId) ?? organizations[0] ?? null
  const membershipQuery = useQuery({
    queryKey: ['organization-members', user!.id, organization?.id],
    queryFn: ({ signal }) => apiRequest<Membership[]>(`/organizations/${organization!.id}/members`, { signal }),
    enabled: Boolean(organization),
  })
  const membership = membershipQuery.data?.find(member => member.user_id === user!.id && member.status === 'active') ?? null
  const error = organizationsQuery.error ?? (organization ? membershipQuery.error : null)
    ?? (organization && membershipQuery.isSuccess && !membership ? new Error('Your active membership could not be verified. Refresh your organizations or contact an administrator.') : null)

  function selectOrganization(id: string) {
    if (!organizations.some(org => org.id === id)) return
    // Queries use organization-specific keys, and old requests are aborted on a switch.
    void queryClient.cancelQueries({ predicate: query => query.queryKey[0] === 'events' || query.queryKey[0] === 'organization-members' })
    setSelectedId(id)
    try { sessionStorage.setItem(storageKey, id) } catch { /* In-memory selection still works. */ }
  }

  return (
    <OrganizationContext.Provider value={{
      organizations,
      organization,
      selectOrganization,
      membership,
      canManageEvents: !error && Boolean(membership && ['Owner', 'Admin'].includes(membership.role)),
      isLoading: organizationsQuery.isPending || Boolean(organization && membershipQuery.isPending),
      error,
      retry: () => { void organizationsQuery.refetch(); if (organization) void membershipQuery.refetch() },
    }}>
      {children}
    </OrganizationContext.Provider>
  )
}
