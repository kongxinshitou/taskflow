// Unified API layer: auth-driven data source switching
// - Logged in (has token) → HTTP API (cloud server)
// - Not logged in + Electron → IPC (local SQLite)
// - Not logged in + Web → HTTP (will trigger 401 → login page)
import api from './api'

export type Priority = 'high' | 'medium' | 'low'
export type Status = 'todo' | 'in_progress' | 'done'

export interface Project {
  id: string
  name: string
  color: string
  description: string | null
  sort_order: number
  created_at: number
  updated_at: number
}

export interface Task {
  id: string
  project_id: string
  parent_id: string | null
  title: string
  notes: string | null
  due_date: number | null
  priority: Priority
  status: Status
  sort_order: number
  notified_1d: number
  notified_0d: number
  completed_at: number | null
  created_at: number
  updated_at: number
}

export interface TaskFilter {
  projectId?: string
  status?: Status
}

export interface CreateProjectInput {
  name: string
  color?: string
  description?: string
}

export interface UpdateProjectInput {
  id: string
  name?: string
  color?: string
  description?: string
  sort_order?: number
}

export interface CreateTaskInput {
  project_id: string
  parent_id?: string | null
  title: string
  notes?: string | null
  due_date?: number | null
  priority?: Priority
  status?: Status
  sort_order?: number
}

export interface UpdateTaskInput {
  id: string
  title?: string
  notes?: string | null
  due_date?: number | null
  priority?: Priority
  status?: Status
  sort_order?: number
}

// Dynamic data source: auth token → cloud, otherwise → local IPC (Electron only)
function shouldUseLocal(): boolean {
  if (typeof localStorage === 'undefined') return false
  if (localStorage.getItem('taskflow_token')) return false
  return typeof window !== 'undefined' && !!(window as any).electronAPI
}

// ── Project API ──────────────────────────────────────────────────────────────

export const projectAPI = {
  list: (): Promise<Project[]> => {
    if (shouldUseLocal()) return (window as any).electronAPI.projectList()
    return api.get<Project[]>('/projects').then((r) => r.data)
  },
  create: (data: CreateProjectInput): Promise<Project> => {
    if (shouldUseLocal()) return (window as any).electronAPI.projectCreate(data)
    return api.post<Project>('/projects', data).then((r) => r.data)
  },
  update: (data: UpdateProjectInput): Promise<Project> => {
    if (shouldUseLocal()) return (window as any).electronAPI.projectUpdate(data)
    const { id, ...body } = data
    return api.put<Project>(`/projects/${id}`, body).then((r) => r.data)
  },
  delete: (id: string): Promise<void> => {
    if (shouldUseLocal()) return (window as any).electronAPI.projectDelete(id)
    return api.delete(`/projects/${id}`).then(() => {})
  }
}

// ── Task API ─────────────────────────────────────────────────────────────────

export const taskAPI = {
  list: (filter?: TaskFilter): Promise<Task[]> => {
    if (shouldUseLocal()) return (window as any).electronAPI.taskList(filter)
    const params: Record<string, string> = {}
    if (filter?.projectId) params.project_id = filter.projectId
    if (filter?.status) params.status = filter.status
    return api.get<Task[]>('/tasks', { params }).then((r) => r.data)
  },
  create: (data: CreateTaskInput): Promise<Task> => {
    if (shouldUseLocal()) return (window as any).electronAPI.taskCreate(data)
    return api.post<Task>('/tasks', data).then((r) => r.data)
  },
  update: (data: UpdateTaskInput): Promise<Task> => {
    if (shouldUseLocal()) return (window as any).electronAPI.taskUpdate(data)
    const { id, ...body } = data
    return api.put<Task>(`/tasks/${id}`, body).then((r) => r.data)
  },
  delete: (id: string): Promise<void> => {
    if (shouldUseLocal()) return (window as any).electronAPI.taskDelete(id)
    return api.delete(`/tasks/${id}`).then(() => {})
  },
  reorder: (ids: string[]): Promise<void> => {
    if (shouldUseLocal()) return (window as any).electronAPI.taskReorder(ids)
    return api.put('/tasks/reorder', { ids }).then(() => {})
  },
  today: (): Promise<Task[]> => {
    return api.get<Task[]>('/tasks/today').then((r) => r.data)
  }
}

// ── Data API ─────────────────────────────────────────────────────────────────

export const dataAPI = {
  export: (params?: {
    period?: string
    date?: string
    format?: string
    type?: string
  }): Promise<any> => {
    if (shouldUseLocal()) return (window as any).electronAPI.dataExport()
    return api.get('/export', { params }).then((r) => r.data)
  },
  import: (data: any): Promise<any> => {
    return api.post('/import', data).then((r) => r.data)
  }
}

// Declare global type for Electron
declare global {
  interface Window {
    electronAPI?: {
      projectList: () => Promise<Project[]>
      projectCreate: (data: CreateProjectInput) => Promise<Project>
      projectUpdate: (data: UpdateProjectInput) => Promise<Project>
      projectDelete: (id: string) => Promise<void>

      taskList: (filter?: TaskFilter) => Promise<Task[]>
      taskCreate: (data: CreateTaskInput) => Promise<Task>
      taskUpdate: (data: UpdateTaskInput) => Promise<Task>
      taskDelete: (id: string) => Promise<void>
      taskReorder: (ids: string[]) => Promise<void>

      dataExport: () => Promise<string | undefined>

      onQuickAddOpen: (callback: () => void) => () => void
      onNavigateToProject: (callback: (projectId: string) => void) => () => void
      sendNotification: (data: { title: string; body: string }) => Promise<void>
    }
  }
}
