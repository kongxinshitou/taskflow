import { contextBridge, ipcRenderer } from 'electron'

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
  notified_1d?: number
  notified_0d?: number
}

const electronAPI = {
  // Projects
  projectList: (): Promise<Project[]> => ipcRenderer.invoke('project:list'),
  projectCreate: (data: CreateProjectInput): Promise<Project> => ipcRenderer.invoke('project:create', data),
  projectUpdate: (data: UpdateProjectInput): Promise<Project> => ipcRenderer.invoke('project:update', data),
  projectDelete: (id: string): Promise<void> => ipcRenderer.invoke('project:delete', id),

  // Tasks
  taskList: (filter?: TaskFilter): Promise<Task[]> => ipcRenderer.invoke('task:list', filter),
  taskCreate: (data: CreateTaskInput): Promise<Task> => ipcRenderer.invoke('task:create', data),
  taskUpdate: (data: UpdateTaskInput): Promise<Task> => ipcRenderer.invoke('task:update', data),
  taskDelete: (id: string): Promise<void> => ipcRenderer.invoke('task:delete', id),
  taskReorder: (ids: string[]): Promise<void> => ipcRenderer.invoke('task:reorder', ids),

  // Data
  dataExport: (): Promise<string | undefined> => ipcRenderer.invoke('data:export'),

  // Events from main process
  onQuickAddOpen: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('quick-add-open', handler)
    return () => ipcRenderer.removeListener('quick-add-open', handler)
  },

  onNavigateToProject: (callback: (projectId: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, projectId: string) => callback(projectId)
    ipcRenderer.on('navigate-to-project', handler)
    return () => ipcRenderer.removeListener('navigate-to-project', handler)
  }
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

// Type augmentation for TypeScript in renderer
export type ElectronAPI = typeof electronAPI
