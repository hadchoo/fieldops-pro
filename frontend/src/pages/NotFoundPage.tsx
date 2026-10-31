import { Link } from 'react-router-dom'
import { EmptyState } from '../components/ui'
import { buttonClassName } from '../components/ui/styles'

export default function NotFoundPage() {
  return <EmptyState title="Page not found" description="This page may have moved, or the address may be incorrect." action={<Link to="/dashboard" className={buttonClassName()}>Back to dashboard</Link>} />
}
