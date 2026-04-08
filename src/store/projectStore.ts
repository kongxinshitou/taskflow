import { create } from 'zustand'
import { projectAPI, type Project, type CreateProjectInput, type UpdateProjectInput } from '../utils/ipc'
import { message } from 'antd'

interface ProjectState {
  projects: Project[]
  loading: boolean
  selectedProjectId: string | null

  // Actions
  fetchProjects: () => Promise<void>
  createProject: (data: CreateProjectInput) => Promise<Project | null>
  updateProject: (data: UpdateProjectInput) => Promise<Project | null>
  deleteProject: (id: string) => Promise<boolean>
  selectProject: (id: string | null) => void
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  loading: false,
  selectedProjectId: null,

  fetchProjects: async () => {
    set({ loading: true })
    try {
      const projects = await projectAPI.list()
      set({ projects, loading: false })
    } catch (err) {
      console.error('[ProjectStore] fetchProjects error:', err)
      message.error('Failed to load projects')
      set({ loading: false })
    }
  },

  createProject: async (data: CreateProjectInput) => {
    try {
      const project = await projectAPI.create(data)
      set((state) => ({ projects: [...state.projects, project] }))
      message.success(`Project "${project.name}" created`)
      return project
    } catch (err) {
      console.error('[ProjectStore] createProject error:', err)
      message.error('Failed to create project')
      return null
    }
  },

  updateProject: async (data: UpdateProjectInput) => {
    try {
      const updated = await projectAPI.update(data)
      set((state) => ({
        projects: state.projects.map((p) => (p.id === updated.id ? updated : p))
      }))
      return updated
    } catch (err) {
      console.error('[ProjectStore] updateProject error:', err)
      message.error('Failed to update project')
      return null
    }
  },

  deleteProject: async (id: string) => {
    const { projects, selectedProjectId } = get()
    const project = projects.find((p) => p.id === id)
    try {
      await projectAPI.delete(id)
      set((state) => ({
        projects: state.projects.filter((p) => p.id !== id),
        selectedProjectId: selectedProjectId === id ? null : selectedProjectId
      }))
      if (project) message.success(`Project "${project.name}" deleted`)
      return true
    } catch (err) {
      console.error('[ProjectStore] deleteProject error:', err)
      message.error('Failed to delete project')
      return false
    }
  },

  selectProject: (id: string | null) => {
    set({ selectedProjectId: id })
  }
}))
