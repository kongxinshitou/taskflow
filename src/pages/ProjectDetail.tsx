import React, { useState, useEffect } from 'react'
import {
  Typography,
  Button,
  Spin,
  Empty,
  Space,
  Tag,
  Segmented,
  Tooltip,
  Popconfirm
} from 'antd'
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  ClearOutlined
} from '@ant-design/icons'
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove
} from '@dnd-kit/sortable'
import { useTaskStore } from '../store/taskStore'
import { useProjectStore } from '../store/projectStore'
import TaskItem from '../components/TaskItem'
import TaskForm from '../components/TaskForm'
import ProjectForm from '../components/ProjectForm'
import type { Status } from '../utils/ipc'

interface ProjectDetailProps {
  projectId: string
  onProjectDeleted: () => void
}

type FilterStatus = 'all' | Status

const ProjectDetail: React.FC<ProjectDetailProps> = ({
  projectId,
  onProjectDeleted
}) => {
  const [addOpen, setAddOpen] = useState(false)
  const [editProjectOpen, setEditProjectOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')

  const { projects, deleteProject } = useProjectStore()
  const { tasks, loading, fetchTasks, reorderTasks, deleteCompletedTasks } =
    useTaskStore()

  const project = projects.find((p) => p.id === projectId)

  useEffect(() => {
    if (projectId) {
      fetchTasks({ projectId })
    }
  }, [projectId])

  // DnD sensors — require 8px movement before drag starts (prevents accidental drags)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  if (!project) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%'
        }}
      >
        <Empty description="项目不存在" />
      </div>
    )
  }

  const projectTasks = tasks
    .filter((t) => t.project_id === projectId && !t.parent_id)
    .sort((a, b) => a.sort_order - b.sort_order || a.created_at - b.created_at)

  const filteredTasks =
    statusFilter === 'all'
      ? projectTasks
      : projectTasks.filter((t) => t.status === statusFilter)

  const counts = {
    all: projectTasks.length,
    todo: projectTasks.filter((t) => t.status === 'todo').length,
    in_progress: projectTasks.filter((t) => t.status === 'in_progress').length,
    done: projectTasks.filter((t) => t.status === 'done').length
  }

  const completedCount = counts.done
  const pendingCount = counts.todo + counts.in_progress

  const handleDeleteProject = async () => {
    await deleteProject(projectId)
    onProjectDeleted()
  }

  const handleClearCompleted = async () => {
    await deleteCompletedTasks(projectId)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = projectTasks.findIndex((t) => t.id === active.id)
    const newIndex = projectTasks.findIndex((t) => t.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(projectTasks, oldIndex, newIndex)
    await reorderTasks(reordered.map((t) => t.id))
  }

  // IDs used by SortableContext must match the current filtered view or all root tasks
  const sortableIds = projectTasks.map((t) => t.id)

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 32px',
        overflowY: 'auto'
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          marginBottom: 8
        }}
      >
        <div style={{ flex: 1 }}>
          <Space align="center">
            <span
              style={{
                display: 'inline-block',
                width: 14,
                height: 14,
                borderRadius: '50%',
                background: project.color,
                marginBottom: 2
              }}
            />
            <Typography.Title level={2} style={{ margin: 0, color: '#1a1a1a' }}>
              {project.name}
            </Typography.Title>
          </Space>
          {project.description && (
            <Typography.Text
              style={{
                color: '#8c8c8c',
                fontSize: 14,
                display: 'block',
                marginTop: 4,
                marginLeft: 22
              }}
            >
              {project.description}
            </Typography.Text>
          )}
          <div style={{ marginTop: 8, marginLeft: 22 }}>
            <Space size={8}>
              <Tag>{counts.all} 个任务</Tag>
              {pendingCount > 0 && (
                <Tag color="blue">{pendingCount} 进行中</Tag>
              )}
              {completedCount > 0 && (
                <Tag color="green">{completedCount} 已完成</Tag>
              )}
            </Space>
          </div>
        </div>

        <Space>
          {completedCount > 0 && (
            <Popconfirm
              title="清除已完成任务？"
              description="此操作将永久删除该项目内所有已完成的任务。"
              onConfirm={handleClearCompleted}
              okText="清除"
              okButtonProps={{ danger: true }}
              cancelText="取消"
            >
              <Tooltip title="清除已完成">
                <Button icon={<ClearOutlined />}>清除已完成</Button>
              </Tooltip>
            </Popconfirm>
          )}
          <Tooltip title="编辑项目">
            <Button
              icon={<EditOutlined />}
              onClick={() => setEditProjectOpen(true)}
            />
          </Tooltip>
          <Popconfirm
            title="删除此项目？"
            description="所有任务都将被永久删除。"
            onConfirm={handleDeleteProject}
            okText="删除"
            okButtonProps={{ danger: true }}
            cancelText="取消"
          >
            <Tooltip title="删除项目">
              <Button danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setAddOpen(true)}
          >
            新建任务
          </Button>
        </Space>
      </div>

      {/* Status filter */}
      <div style={{ marginBottom: 20, marginTop: 8 }}>
        <Segmented
          value={statusFilter}
          onChange={(v) => setStatusFilter(v as FilterStatus)}
          options={[
            { label: `全部 (${counts.all})`, value: 'all' },
            { label: `待办 (${counts.todo})`, value: 'todo' },
            { label: `进行中 (${counts.in_progress})`, value: 'in_progress' },
            { label: `已完成 (${counts.done})`, value: 'done' }
          ]}
        />
      </div>

      {/* Task list with DnD */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
          <Spin size="large" />
        </div>
      ) : filteredTasks.length === 0 ? (
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              statusFilter === 'all'
                ? '暂无任务，点击"新建任务"创建第一个任务'
                : `没有${statusFilter === 'todo' ? '待办' : statusFilter === 'in_progress' ? '进行中的' : '已完成的'}任务`
            }
          >
            {statusFilter === 'all' && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setAddOpen(true)}
              >
                新建任务
              </Button>
            )}
          </Empty>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sortableIds}
            strategy={verticalListSortingStrategy}
          >
            <div>
              {filteredTasks.map((task) => (
                <TaskItem key={task.id} task={task} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Add task modal */}
      <TaskForm
        open={addOpen}
        projectId={projectId}
        onClose={() => setAddOpen(false)}
      />

      {/* Edit project modal */}
      <ProjectForm
        open={editProjectOpen}
        project={project}
        onClose={() => setEditProjectOpen(false)}
      />
    </div>
  )
}

export default ProjectDetail
