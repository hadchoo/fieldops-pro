/** Contracts from backend/app/schemas and the existing FastAPI routers. */
export interface User {
  id: string
  name: string
  email: string
  created_at: string
}

export interface Organization {
  id: string
  name: string
  created_at: string
}

export interface Membership {
  id: string
  user_id: string
  name: string
  email: string
  role: string
  status: string
  created_at: string
}

export interface LoginCredentials { email: string; password: string }
export interface LoginResponse { access_token: string; token_type: string }

export interface EventRecord {
  id: string
  organization_id: string
  title: string
  description: string | null
  location: string | null
  start_at: string
  end_at: string
  status: string
  archived_at: string | null
  created_at: string
  capacity: number | null
}

export interface EventCreate {
  organization_id: string
  title: string
  description: string | null
  location: string | null
  start_at: string
  end_at: string
  capacity: number | null
}
