import { create } from 'zustand'
import { taskAPI, type Task, type TaskFilter, type CreateTaskInput, type UpdateTaskInput } from '../utils/ipc'
import { message } from 'antd'

interface TaskState {
  tasks: Task[]
  loading: boolean

  // Actions
  fetchTasks: (filter?: TaskFilter) => Promise<void>
  createTask: (data: CreateTaskInput) => Promise<Task | null>
  updateTask: (data: UpdateTaskInput) => Promise<Task | null>
  deleteTask: (id: string) => Promise<boolean>
  toggleTaskStatus: (task: Task) => Promise<Task | null>
  reorderTasks: (ids: string[]) => Promise<void>
  deleteCompletedTasks: (projectId: string) => Promise<void>

  // Selectors (computed from tasks)
  getProjectTasks: (projectId: string) => Task[]
  getSubTasks: (parentId: string) => Task[]
  getTodayTasks: () => Task[]
}

function isToday(timestamp: number | null): boolean {
  if (!timestamp) return false
  const d = new Date(timestamp)
  const today = new Date()
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  )
}

function isOverdue(timestamp: number | null): boolean {
  if (!timestamp) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return timestamp < today.getTime()
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  loading: false,

  fetchTasks: async (filter?: TaskFilter) => {
    set({ loading: true })
    try {
      const tasks = await taskAPI.list(filter)
      if (filter?.projectId) {
        // Replace tasks for this project
        set((state) => ({
          tasks: [
            ...state.tasks.filter((t) => t.project_id !== filter.projectId),
            ...tasks
          ],
          loading: false
        }))
      } else {
        set({ tasks, loading: false })
      }
    } catch (err) {
      console.error('[TaskStore] fetchTasks error:', err)
      message.error('Failed to load tasks')
      set({ loading: false })
    }
  },

  createTask: async (data: CreateTaskInput) => {
    try {
      const task = await taskAPI.create(data)
      set((state) => ({ tasks: [...state.tasks, task] }))
      return task
    } catch (err) {
      console.error('[TaskStore] createTask error:', err)
      message.error('Failed to create task')
      return null
    }
  },

  updateTask: async (data: UpdateTaskInput) => {
    try {
      const updated = await taskAPI.update(data)
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === updated.id ? updated : t))
      }))
      return updated
    } catch (err) {
      console.error('[TaskStore] updateTask error:', err)
      message.error('Failed to update task')
      return null
    }
  },

  deleteTask: async (id: string) => {
    try {
      await taskAPI.delete(id)
      set((state) => ({
        // Remove the task and any sub-tasks that might reference it
        tasks: state.tasks.filter((t) => t.id !== id && t.parent_id !== id)
      }))
      return true
    } catch (err) {
      console.error('[TaskStore] deleteTask error:', err)
      message.error('Failed to delete task')
      return false
    }
  },

  toggleTaskStatus: async (task: Task) => {
    const nextStatus: Task['status'] =
      task.status === 'done' ? 'todo' : task.status === 'todo' ? 'done' : 'done'
    return get().updateTask({ id: task.id, status: nextStatus })
  },

  reorderTasks: async (ids: string[]) => {
    try {
      await taskAPI.reorder(ids)
      // Update sort_order in local state
      set((state) => ({
        tasks: state.tasks.map((t) => {
          const idx = ids.indexOf(t.id)
          if (idx === -1) return t
          return { ...t, sort_order: idx }
        })
      }))
    } catch (err) {
      console.error('[TaskStore] reorderTasks error:', err)
      message.error('Failed to reorder tasks')
    }
  },

  deleteCompletedTasks: async (projectId: string) => {
    const { tasks, deleteTask } = get()
    const completed = tasks.filter(
      (t) => t.project_id === projectId && t.status === 'done' && !t.parent_id
    )
    for (const t of completed) {
      await deleteTask(t.id)
    }
    if (completed.length > 0) {
      message.success(`Deleted ${completed.length} completed task(s)`)
    }
  },

  getProjectTasks: (projectId: string) => {
    return get()
      .tasks.filter((t) => t.project_id === projectId && !t.parent_id)
      .sort((a, b) => a.sort_order - b.sort_order || a.created_at - b.created_at)
  },

  getSubTasks: (parentId: string) => {
    return get()
      .tasks.filter((t) => t.parent_id === parentId)
      .sort((a, b) => a.sort_order - b.sort_order || a.created_at - b.created_at)
  },

  getTodayTasks: () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return get()
      .tasks.filter((t) => !t.parent_id && (isToday(t.due_date) || isOverdue(t.due_date)))
      .sort((a, b) => {
        // Sort by: overdue first, then by priority, then by created_at
        const aOverdue = isOverdue(a.due_date) ? 0 : 1
        const bOverdue = isOverdue(b.due_date) ? 0 : 1
        if (aOverdue !== bOverdue) return aOverdue - bOverdue
        const priorityOrder = { high: 0, medium: 1, low: 2 }
        return priorityOrder[a.priority] - priorityOrder[b.priority]
      })
  }
}))
