import { Outlet } from 'react-router-dom'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui'
import { useOrganization } from './useOrganization'

export function OrganizationGate() {
  const scope = useOrganization()
  if (scope.isLoading) return <LoadingState label="Loading your organization…" />
  if (scope.error) return <ErrorState title="Unable to load your workspace" error={scope.error} onRetry={scope.retry} />
  if (!scope.organization) return <EmptyState title="No active organizations" description="Your account does not have an active organization membership. Ask an organization owner or administrator to add you, then refresh this page." />
  return <Outlet key={scope.organization.id} />
}
