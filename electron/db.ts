import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'path'
import fs from 'fs'

let db: Database.Database

export function getDb(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized')
  }
  return db
}

export function initDb(): void {
  const userDataPath = app.getPath('userData')
  const dbDir = path.join(userDataPath)

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
  }

  const dbPath = path.join(dbDir, 'taskflow.db')
  db = new Database(dbPath)

  // Enable WAL mode for better performance
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      color       TEXT DEFAULT '#1677ff',
      description TEXT,
      sort_order  INTEGER DEFAULT 0,
      created_at  INTEGER NOT NULL,
      updated_at  INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id           TEXT PRIMARY KEY,
      project_id   TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      parent_id    TEXT REFERENCES tasks(id) ON DELETE CASCADE,
      title        TEXT NOT NULL,
      notes        TEXT,
      due_date     INTEGER,
      priority     TEXT DEFAULT 'medium',
      status       TEXT DEFAULT 'todo',
      sort_order   INTEGER DEFAULT 0,
      notified_1d  INTEGER DEFAULT 0,
      notified_0d  INTEGER DEFAULT 0,
      created_at   INTEGER NOT NULL,
      updated_at   INTEGER NOT NULL
    );
  `)

  console.log('[DB] Initialized at:', dbPath)
}

// ── Project CRUD ────────────────────────────────────────────────────────────

export function dbListProjects(): Project[] {
  return getDb()
    .prepare('SELECT * FROM projects ORDER BY sort_order ASC, created_at ASC')
    .all() as Project[]
}

export function dbCreateProject(data: Omit<Project, 'created_at' | 'updated_at'>): Project {
  const now = Date.now()
  const project: Project = { ...data, created_at: now, updated_at: now }
  getDb()
    .prepare(
      `INSERT INTO projects (id, name, color, description, sort_order, created_at, updated_at)
       VALUES (@id, @name, @color, @description, @sort_order, @created_at, @updated_at)`
    )
    .run(project)
  return project
}

export function dbUpdateProject(data: Partial<Project> & { id: string }): Project {
  const existing = getDb()
    .prepare('SELECT * FROM projects WHERE id = ?')
    .get(data.id) as Project | undefined

  if (!existing) throw new Error(`Project not found: ${data.id}`)

  const updated: Project = {
    ...existing,
    ...data,
    updated_at: Date.now()
  }

  getDb()
    .prepare(
      `UPDATE projects SET name=@name, color=@color, description=@description,
       sort_order=@sort_order, updated_at=@updated_at WHERE id=@id`
    )
    .run(updated)

  return updated
}

export function dbDeleteProject(id: string): void {
  getDb().prepare('DELETE FROM projects WHERE id = ?').run(id)
}

// ── Task CRUD ────────────────────────────────────────────────────────────────

export interface TaskFilter {
  projectId?: string
  status?: string
  parentId?: string | null
}

export function dbListTasks(filter: TaskFilter = {}): Task[] {
  let query = 'SELECT * FROM tasks WHERE 1=1'
  const params: Record<string, string | number | null> = {}

  if (filter.projectId) {
    query += ' AND project_id = @projectId'
    params.projectId = filter.projectId
  }
  if (filter.status) {
    query += ' AND status = @status'
    params.status = filter.status
  }

  query += ' ORDER BY sort_order ASC, created_at ASC'

  return getDb().prepare(query).all(params) as Task[]
}

export function dbCreateTask(data: Omit<Task, 'created_at' | 'updated_at'>): Task {
  const now = Date.now()
  const task: Task = { ...data, created_at: now, updated_at: now }

  getDb()
    .prepare(
      `INSERT INTO tasks
        (id, project_id, parent_id, title, notes, due_date, priority, status,
         sort_order, notified_1d, notified_0d, created_at, updated_at)
       VALUES
        (@id, @project_id, @parent_id, @title, @notes, @due_date, @priority, @status,
         @sort_order, @notified_1d, @notified_0d, @created_at, @updated_at)`
    )
    .run(task)

  return task
}

export function dbUpdateTask(data: Partial<Task> & { id: string }): Task {
  const existing = getDb()
    .prepare('SELECT * FROM tasks WHERE id = ?')
    .get(data.id) as Task | undefined

  if (!existing) throw new Error(`Task not found: ${data.id}`)

  const updated: Task = {
    ...existing,
    ...data,
    updated_at: Date.now()
  }

  getDb()
    .prepare(
      `UPDATE tasks SET
        project_id=@project_id, parent_id=@parent_id, title=@title,
        notes=@notes, due_date=@due_date, priority=@priority, status=@status,
        sort_order=@sort_order, notified_1d=@notified_1d, notified_0d=@notified_0d,
        updated_at=@updated_at
       WHERE id=@id`
    )
    .run(updated)

  return updated
}

export function dbDeleteTask(id: string): void {
  getDb().prepare('DELETE FROM tasks WHERE id = ?').run(id)
}

export function dbReorderTasks(ids: string[]): void {
  const stmt = getDb().prepare('UPDATE tasks SET sort_order=@order WHERE id=@id')
  const reorder = getDb().transaction((orderedIds: string[]) => {
    orderedIds.forEach((id, index) => {
      stmt.run({ order: index, id })
    })
  })
  reorder(ids)
}

export function dbExportAll(): { projects: Project[]; tasks: Task[] } {
  const projects = getDb().prepare('SELECT * FROM projects ORDER BY sort_order').all() as Project[]
  const tasks = getDb().prepare('SELECT * FROM tasks ORDER BY sort_order').all() as Task[]
  return { projects, tasks }
}

// ── Types (shared with renderer via preload) ─────────────────────────────────

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
  priority: 'high' | 'medium' | 'low'
  status: 'todo' | 'in_progress' | 'done'
  sort_order: number
  notified_1d: number
  notified_0d: number
  created_at: number
  updated_at: number
}
