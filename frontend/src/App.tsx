import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import { ProtectedRoute } from './features/auth/ProtectedRoute'
import { OrganizationProvider } from './features/organizations/OrganizationProvider'
import { OrganizationGate } from './features/organizations/OrganizationGate'
import DashboardPage from './pages/DashboardPage'
import EventsPage from './pages/EventsPage'
import EventDetailPage from './pages/EventDetailPage'
import CreateEventPage from './pages/CreateEventPage'
import LoginPage from './pages/LoginPage'
import NotFoundPage from './pages/NotFoundPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<OrganizationProvider><AppLayout /></OrganizationProvider>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route element={<OrganizationGate />}>
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="events" element={<EventsPage />} />
            <Route path="events/new" element={<CreateEventPage />} />
            <Route path="events/:eventId" element={<EventDetailPage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  )
}
