import { ipcMain, dialog, app } from 'electron'
import { randomUUID } from 'crypto'
import fs from 'fs'
import path from 'path'
import {
  dbListProjects,
  dbCreateProject,
  dbUpdateProject,
  dbDeleteProject,
  dbListTasks,
  dbCreateTask,
  dbUpdateTask,
  dbDeleteTask,
  dbReorderTasks,
  dbExportAll,
  type TaskFilter
} from './db'

export function registerIpcHandlers(): void {
  // ── Projects ──────────────────────────────────────────────────────────────

  ipcMain.handle('project:list', () => {
    return dbListProjects()
  })

  ipcMain.handle('project:create', (_event, data: { name: string; color?: string; description?: string }) => {
    const project = dbCreateProject({
      id: randomUUID(),
      name: data.name,
      color: data.color ?? '#1677ff',
      description: data.description ?? null,
      sort_order: 0
    })
    return project
  })

  ipcMain.handle('project:update', (_event, data: { id: string; name?: string; color?: string; description?: string; sort_order?: number }) => {
    return dbUpdateProject(data)
  })

  ipcMain.handle('project:delete', (_event, id: string) => {
    dbDeleteProject(id)
  })

  // ── Tasks ─────────────────────────────────────────────────────────────────

  ipcMain.handle('task:list', (_event, filter: TaskFilter = {}) => {
    return dbListTasks(filter)
  })

  ipcMain.handle('task:create', (_event, data: {
    project_id: string
    parent_id?: string | null
    title: string
    notes?: string | null
    due_date?: number | null
    priority?: 'high' | 'medium' | 'low'
    status?: 'todo' | 'in_progress' | 'done'
    sort_order?: number
  }) => {
    const task = dbCreateTask({
      id: randomUUID(),
      project_id: data.project_id,
      parent_id: data.parent_id ?? null,
      title: data.title,
      notes: data.notes ?? null,
      due_date: data.due_date ?? null,
      priority: data.priority ?? 'medium',
      status: data.status ?? 'todo',
      sort_order: data.sort_order ?? 0,
      notified_1d: 0,
      notified_0d: 0
    })
    return task
  })

  ipcMain.handle('task:update', (_event, data: {
    id: string
    title?: string
    notes?: string | null
    due_date?: number | null
    priority?: 'high' | 'medium' | 'low'
    status?: 'todo' | 'in_progress' | 'done'
    sort_order?: number
    notified_1d?: number
    notified_0d?: number
  }) => {
    return dbUpdateTask(data)
  })

  ipcMain.handle('task:delete', (_event, id: string) => {
    dbDeleteTask(id)
  })

  ipcMain.handle('task:reorder', (_event, ids: string[]) => {
    dbReorderTasks(ids)
  })

  // ── Data Export ───────────────────────────────────────────────────────────

  ipcMain.handle('data:export', async (event) => {
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Export TaskFlow Data',
      defaultPath: path.join(app.getPath('documents'), `taskflow-export-${Date.now()}.json`),
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })

    if (canceled || !filePath) return

    const data = dbExportAll()
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
    return filePath
  })
}
