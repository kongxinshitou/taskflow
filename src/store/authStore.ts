import { create } from 'zustand'
import { authAPI } from '../utils/api'
import { useProjectStore } from './projectStore'
import { useTaskStore } from './taskStore'

interface AuthUser {
  id: string
  username: string
  email?: string
}

interface AuthState {
  token: string | null
  user: AuthUser | null
  initialized: boolean

  init: () => Promise<void>
  login: (username: string, password: string) => Promise<boolean>
  register: (username: string, password: string, email?: string) => Promise<boolean>
  logout: () => void
}

// Refresh all data after switching data source (login/logout)
async function refreshAllData(): Promise<void> {
  const { fetchProjects } = useProjectStore.getState()
  const { fetchTasks } = useTaskStore.getState()
  await Promise.all([fetchProjects(), fetchTasks()])
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('taskflow_token'),
  user: JSON.parse(localStorage.getItem('taskflow_user') || 'null'),
  initialized: false,

  init: async () => {
    const token = localStorage.getItem('taskflow_token')
    if (token) {
      try {
        const user = await authAPI.me()
        localStorage.setItem('taskflow_user', JSON.stringify(user))
        set({ token, user, initialized: true })
      } catch {
        localStorage.removeItem('taskflow_token')
        localStorage.removeItem('taskflow_user')
        set({ token: null, user: null, initialized: true })
      }
    } else {
      set({ initialized: true })
    }
  },

  login: async (username: string, password: string) => {
    try {
      const res = await authAPI.login({ username, password })
      localStorage.setItem('taskflow_token', res.token)
      localStorage.setItem('taskflow_user', JSON.stringify(res.user))
      set({ token: res.token, user: res.user })
      // Switched to cloud data source — reload
      await refreshAllData()
      return true
    } catch {
      return false
    }
  },

  register: async (username: string, password: string, email?: string) => {
    try {
      const res = await authAPI.register({ username, password, email })
      localStorage.setItem('taskflow_token', res.token)
      localStorage.setItem('taskflow_user', JSON.stringify(res.user))
      set({ token: res.token, user: res.user })
      await refreshAllData()
      return true
    } catch {
      return false
    }
  },

  logout: () => {
    localStorage.removeItem('taskflow_token')
    localStorage.removeItem('taskflow_user')
    set({ token: null, user: null })
    // Switched back to local data source — reload
    refreshAllData()
  }
}))
