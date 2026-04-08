import React, { useState } from 'react'
import {
  Button,
  Typography,
  Tooltip,
  Popconfirm,
  Space,
  Badge,
  Empty
} from 'antd'
import {
  PlusOutlined,
  HomeOutlined,
  EditOutlined,
  DeleteOutlined,
  SettingOutlined,
  ProjectOutlined
} from '@ant-design/icons'
import { useProjectStore } from '../store/projectStore'
import { useTaskStore } from '../store/taskStore'
import ProjectForm from './ProjectForm'
import type { Project } from '../utils/ipc'

interface SidebarProps {
  onNavigate: (page: 'home' | 'project' | 'settings', projectId?: string) => void
  currentPage: string
  currentProjectId?: string | null
}

const Sidebar: React.FC<SidebarProps> = ({ onNavigate, currentPage, currentProjectId }) => {
  const { projects, deleteProject } = useProjectStore()
  const { tasks } = useTaskStore()
  const [formOpen, setFormOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)

  const getProjectTaskCount = (projectId: string) =>
    tasks.filter((t) => t.project_id === projectId && !t.parent_id && t.status !== 'done').length

  const todayCount = tasks.filter((t) => {
    if (!t.due_date || t.status === 'done' || t.parent_id) return false
    const today = new Date()
    const d = new Date(t.due_date)
    return (
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() <= today.getDate()
    )
  }).length

  const handleEditProject = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation()
    setEditingProject(project)
    setFormOpen(true)
  }

  const handleDeleteProject = async (e: React.MouseEvent | undefined, id: string) => {
    e?.stopPropagation()
    await deleteProject(id)
    if (currentProjectId === id) {
      onNavigate('home')
    }
  }

  const navItem = (
    key: string,
    icon: React.ReactNode,
    label: string,
    badge?: number,
    onClick?: () => void
  ) => {
    const active = key === currentPage && !currentProjectId
    return (
      <div
        key={key}
        onClick={onClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          borderRadius: 8,
          cursor: 'pointer',
          background: active ? '#e6f4ff' : 'transparent',
          color: active ? '#1677ff' : '#595959',
          fontWeight: active ? 600 : 400,
          transition: 'background 0.15s',
          marginBottom: 2,
          userSelect: 'none'
        }}
        onMouseEnter={(e) => {
          if (!active)
            (e.currentTarget as HTMLDivElement).style.background = '#f5f5f5'
        }}
        onMouseLeave={(e) => {
          if (!active)
            (e.currentTarget as HTMLDivElement).style.background = 'transparent'
        }}
      >
        {icon}
        <span style={{ flex: 1, fontSize: 14 }}>{label}</span>
        {badge !== undefined && badge > 0 && (
          <Badge count={badge} size="small" color="#1677ff" />
        )}
      </div>
    )
  }

  return (
    <div
      style={{
        width: 220,
        minWidth: 220,
        height: '100%',
        background: '#fafafa',
        borderRight: '1px solid #f0f0f0',
        display: 'flex',
        flexDirection: 'column',
        padding: '16px 12px'
      }}
    >
      {/* App title */}
      <div style={{ marginBottom: 20, paddingLeft: 4 }}>
        <Typography.Title level={4} style={{ margin: 0, color: '#1677ff' }}>
          TaskFlow
        </Typography.Title>
      </div>

      {/* Navigation */}
      {navItem('home', <HomeOutlined />, 'Today', todayCount, () => onNavigate('home'))}

      {/* Projects section */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '8px 4px 4px',
          marginTop: 8
        }}
      >
        <Typography.Text
          style={{ fontSize: 11, fontWeight: 600, color: '#8c8c8c', textTransform: 'uppercase', letterSpacing: 0.5, flex: 1 }}
        >
          Projects
        </Typography.Text>
        <Tooltip title="New Project">
          <Button
            type="text"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingProject(null)
              setFormOpen(true)
            }}
            style={{ color: '#8c8c8c', padding: '0 4px' }}
          />
        </Tooltip>
      </div>

      {/* Project list */}
      <div style={{ flex: 1, overflowY: 'auto', marginTop: 4 }}>
        {projects.length === 0 && (
          <div style={{ padding: '12px 4px' }}>
            <Typography.Text style={{ fontSize: 12, color: '#bfbfbf' }}>
              No projects yet. Click + to create one.
            </Typography.Text>
          </div>
        )}

        {projects.map((project) => {
          const active = currentPage === 'project' && currentProjectId === project.id
          const count = getProjectTaskCount(project.id)

          return (
            <div
              key={project.id}
              onClick={() => onNavigate('project', project.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '7px 8px',
                borderRadius: 8,
                cursor: 'pointer',
                background: active ? '#e6f4ff' : 'transparent',
                color: active ? '#1677ff' : '#595959',
                fontWeight: active ? 600 : 400,
                transition: 'background 0.15s',
                marginBottom: 2,
                userSelect: 'none',
                position: 'relative'
              }}
              className="project-nav-item"
              onMouseEnter={(e) => {
                if (!active)
                  (e.currentTarget as HTMLDivElement).style.background = '#f5f5f5'
                const actions = e.currentTarget.querySelector('.project-nav-actions') as HTMLElement
                if (actions) actions.style.display = 'flex'
              }}
              onMouseLeave={(e) => {
                if (!active)
                  (e.currentTarget as HTMLDivElement).style.background = 'transparent'
                const actions = e.currentTarget.querySelector('.project-nav-actions') as HTMLElement
                if (actions) actions.style.display = 'none'
              }}
            >
              {/* Color dot */}
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: project.color,
                  flexShrink: 0
                }}
              />

              {/* Name */}
              <span style={{ flex: 1, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {project.name}
              </span>

              {/* Task count (hidden on hover) */}
              {count > 0 && (
                <span className="project-task-count" style={{ fontSize: 11, color: '#bfbfbf' }}>
                  {count}
                </span>
              )}

              {/* Action buttons (shown on hover) */}
              <Space
                className="project-nav-actions"
                size={0}
                style={{ display: 'none', position: 'absolute', right: 8 }}
              >
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined style={{ fontSize: 11 }} />}
                  onClick={(e) => handleEditProject(e, project)}
                  style={{ color: '#8c8c8c', padding: '0 3px', height: 20 }}
                />
                <Popconfirm
                  title="Delete project?"
                  description="All tasks in this project will be deleted."
                  onConfirm={(e) => handleDeleteProject(e as any, project.id)}
                  onCancel={(e) => e?.stopPropagation()}
                  okText="Delete"
                  okButtonProps={{ danger: true }}
                  cancelText="Cancel"
                >
                  <Button
                    type="text"
                    size="small"
                    icon={<DeleteOutlined style={{ fontSize: 11 }} />}
                    onClick={(e) => e.stopPropagation()}
                    style={{ color: '#8c8c8c', padding: '0 3px', height: 20 }}
                  />
                </Popconfirm>
              </Space>
            </div>
          )
        })}
      </div>

      {/* Settings */}
      <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 12, marginTop: 8 }}>
        {navItem(
          'settings',
          <SettingOutlined />,
          'Settings',
          undefined,
          () => onNavigate('settings')
        )}
      </div>

      {/* Project form modal */}
      <ProjectForm
        open={formOpen}
        project={editingProject}
        onClose={() => {
          setFormOpen(false)
          setEditingProject(null)
        }}
      />
    </div>
  )
}

export default Sidebar
