import { create } from 'zustand'
import { activityAPI, type Activity, type CreateActivityInput } from '../utils/api'
import { message } from 'antd'

interface ActivityState {
  activities: Activity[]
  loading: boolean

  fetchActivities: (params?: {
    start_date?: string
    end_date?: string
    project_id?: string
    source?: string
  }) => Promise<void>
  createActivity: (data: CreateActivityInput) => Promise<Activity | null>
  updateActivity: (id: string, data: Partial<CreateActivityInput>) => Promise<Activity | null>
  deleteActivity: (id: string) => Promise<boolean>
  batchCreate: (activities: CreateActivityInput[]) => Promise<number>
}

export const useActivityStore = create<ActivityState>((set) => ({
  activities: [],
  loading: false,

  fetchActivities: async (params) => {
    set({ loading: true })
    try {
      const activities = await activityAPI.list(params)
      set({ activities, loading: false })
    } catch (err) {
      console.error('[ActivityStore] fetch error:', err)
      message.error('Failed to load activities')
      set({ loading: false })
    }
  },

  createActivity: async (data) => {
    try {
      const activity = await activityAPI.create(data)
      set((state) => ({ activities: [activity, ...state.activities] }))
      return activity
    } catch (err) {
      console.error('[ActivityStore] create error:', err)
      message.error('Failed to create activity')
      return null
    }
  },

  updateActivity: async (id, data) => {
    try {
      const updated = await activityAPI.update(id, data)
      set((state) => ({
        activities: state.activities.map((a) => (a.id === updated.id ? updated : a))
      }))
      return updated
    } catch (err) {
      console.error('[ActivityStore] update error:', err)
      message.error('Failed to update activity')
      return null
    }
  },

  deleteActivity: async (id) => {
    try {
      await activityAPI.delete(id)
      set((state) => ({
        activities: state.activities.filter((a) => a.id !== id)
      }))
      return true
    } catch (err) {
      console.error('[ActivityStore] delete error:', err)
      message.error('Failed to delete activity')
      return false
    }
  },

  batchCreate: async (activities) => {
    try {
      const res = await activityAPI.batchCreate(activities)
      return res.count
    } catch (err) {
      console.error('[ActivityStore] batch error:', err)
      return 0
    }
  }
}))
