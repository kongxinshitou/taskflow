// Typed wrappers around window.electronAPI exposed by contextBridge

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

// Declare global type
declare global {
  interface Window {
    electronAPI: {
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
    }
  }
}

// ── Project API ──────────────────────────────────────────────────────────────

export const projectAPI = {
  list: (): Promise<Project[]> => window.electronAPI.projectList(),
  create: (data: CreateProjectInput): Promise<Project> => window.electronAPI.projectCreate(data),
  update: (data: UpdateProjectInput): Promise<Project> => window.electronAPI.projectUpdate(data),
  delete: (id: string): Promise<void> => window.electronAPI.projectDelete(id)
}

// ── Task API ─────────────────────────────────────────────────────────────────

export const taskAPI = {
  list: (filter?: TaskFilter): Promise<Task[]> => window.electronAPI.taskList(filter),
  create: (data: CreateTaskInput): Promise<Task> => window.electronAPI.taskCreate(data),
  update: (data: UpdateTaskInput): Promise<Task> => window.electronAPI.taskUpdate(data),
  delete: (id: string): Promise<void> => window.electronAPI.taskDelete(id),
  reorder: (ids: string[]): Promise<void> => window.electronAPI.taskReorder(ids)
}

// ── Data API ─────────────────────────────────────────────────────────────────

export const dataAPI = {
  export: (): Promise<string | undefined> => window.electronAPI.dataExport()
}
