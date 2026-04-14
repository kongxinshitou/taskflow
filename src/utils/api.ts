import axios from 'axios'

const DEFAULT_API_URL = 'http://localhost:8080/api'

function getStoredApiUrl(): string {
  return localStorage.getItem('taskflow_api_url') || DEFAULT_API_URL
}

export function getApiBaseUrl(): string {
  return getStoredApiUrl()
}

export function setApiBaseUrl(url: string): void {
  const trimmed = url.replace(/\/+$/, '')
  localStorage.setItem('taskflow_api_url', trimmed)
  api.defaults.baseURL = trimmed
}

const api = axios.create({
  baseURL: getStoredApiUrl(),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor: attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('taskflow_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor: handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('taskflow_token')
      localStorage.removeItem('taskflow_user')
      window.location.hash = '#/login'
    }
    return Promise.reject(error)
  }
)

export default api

// ── Auth API ──────────────────────────────────────────────────────────────────

export interface AuthResponse {
  token: string
  user: { id: string; username: string; email?: string }
}

export const authAPI = {
  register: (data: { username: string; password: string; email?: string }) =>
    api.post<AuthResponse>('/auth/register', data).then((r) => r.data),
  login: (data: { username: string; password: string }) =>
    api.post<AuthResponse>('/auth/login', data).then((r) => r.data),
  me: () => api.get<{ id: string; username: string; email?: string }>('/auth/me').then((r) => r.data)
}

// ── Activity API ──────────────────────────────────────────────────────────────

export interface Activity {
  id: string
  user_id: string
  project_id: string | null
  task_id: string | null
  title: string
  description: string
  source: string
  session_id: string
  tags: string
  done_at: number
  created_at: number
  updated_at: number
}

export interface CreateActivityInput {
  title: string
  description?: string
  project_id?: string | null
  source?: string
  tags?: string
  done_at?: number
}

export const activityAPI = {
  list: (params?: { start_date?: string; end_date?: string; project_id?: string; source?: string }) =>
    api.get<Activity[]>('/activities', { params }).then((r) => r.data),
  create: (data: CreateActivityInput) => api.post<Activity>('/activities', data).then((r) => r.data),
  update: (id: string, data: Partial<CreateActivityInput>) =>
    api.put<Activity>(`/activities/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/activities/${id}`).then((r) => r.data),
  batchCreate: (activities: CreateActivityInput[]) =>
    api.post<{ count: number }>('/activities/batch', { activities }).then((r) => r.data)
}
