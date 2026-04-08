import React, { useState } from 'react'
import {
  Checkbox,
  Tag,
  Button,
  Space,
  Tooltip,
  Typography,
  Popconfirm
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CaretRightOutlined,
  CaretDownOutlined,
  CalendarOutlined,
  ExclamationCircleOutlined,
  HolderOutlined
} from '@ant-design/icons'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import dayjs from 'dayjs'
import { useTaskStore } from '../store/taskStore'
import type { Task } from '../utils/ipc'
import TaskForm from './TaskForm'
import TaskDetail from './TaskDetail'

interface TaskItemProps {
  task: Task
  depth?: number
}

const priorityConfig = {
  high: { color: 'red', label: 'High' },
  medium: { color: 'orange', label: 'Med' },
  low: { color: 'green', label: 'Low' }
}

const TaskItem: React.FC<TaskItemProps> = ({ task, depth = 0 }) => {
  const [expanded, setExpanded] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [addSubOpen, setAddSubOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [checking, setChecking] = useState(false)

  const { toggleTaskStatus, deleteTask, getSubTasks } = useTaskStore()
  const subTasks = getSubTasks(task.id)
  const hasSubTasks = subTasks.length > 0

  // Drag-and-drop (only for root tasks)
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: task.id, disabled: depth > 0 })

  const dragStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    position: 'relative',
    zIndex: isDragging ? 999 : undefined
  }

  const isDone = task.status === 'done'
  const isOverdue = task.due_date && task.due_date < Date.now() && !isDone

  const handleCheck = async () => {
    setChecking(true)
    await toggleTaskStatus(task)
    setChecking(false)
  }

  const handleDelete = async () => {
    await deleteTask(task.id)
  }

  const dueDateLabel = task.due_date
    ? dayjs(task.due_date).format('MMM D')
    : null

  return (
    <div
      ref={depth === 0 ? setNodeRef : undefined}
      style={depth === 0 ? { ...dragStyle, marginBottom: 4 } : { marginBottom: 4 }}
    >
      <div
        style={{
          marginLeft: depth * 24,
          borderLeft: depth > 0 ? '2px solid #f0f0f0' : 'none',
          paddingLeft: depth > 0 ? 12 : 0
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '8px 12px',
            borderRadius: 8,
            background: isDragging ? '#f0f5ff' : '#fff',
            border: isDragging ? '1px solid #adc6ff' : '1px solid #f5f5f5',
            boxShadow: isDragging ? '0 4px 16px rgba(22,119,255,0.15)' : undefined,
            transition: 'box-shadow 0.2s, border-color 0.2s',
            gap: 6
          }}
          onMouseEnter={(e) => {
            if (!isDragging) {
              (e.currentTarget as HTMLDivElement).style.boxShadow =
                '0 2px 8px rgba(0,0,0,0.08)'
            }
          }}
          onMouseLeave={(e) => {
            if (!isDragging) {
              (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'
            }
          }}
        >
          {/* Drag handle (root tasks only) */}
          {depth === 0 && (
            <div
              {...attributes}
              {...listeners}
              style={{
                cursor: 'grab',
                color: '#d9d9d9',
                display: 'flex',
                alignItems: 'center',
                padding: '0 2px',
                flexShrink: 0,
                touchAction: 'none'
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLDivElement).style.color = '#8c8c8c')
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLDivElement).style.color = '#d9d9d9')
              }
            >
              <HolderOutlined style={{ fontSize: 14 }} />
            </div>
          )}

          {/* Expand/Collapse button */}
          {depth === 0 && (
            <Button
              type="text"
              size="small"
              icon={
                hasSubTasks ? (
                  expanded ? (
                    <CaretDownOutlined />
                  ) : (
                    <CaretRightOutlined />
                  )
                ) : undefined
              }
              onClick={() => hasSubTasks && setExpanded(!expanded)}
              style={{
                width: 20,
                padding: 0,
                color: '#bfbfbf',
                cursor: hasSubTasks ? 'pointer' : 'default',
                flexShrink: 0
              }}
            />
          )}

          {/* Checkbox */}
          <Checkbox
            checked={isDone}
            onChange={handleCheck}
            disabled={checking}
            style={{ flexShrink: 0 }}
          />

          {/* Title — clickable to open detail */}
          <Typography.Text
            style={{
              flex: 1,
              textDecoration: isDone ? 'line-through' : 'none',
              color: isDone ? '#bfbfbf' : 'inherit',
              transition: 'all 0.2s',
              fontSize: depth > 0 ? 13 : 14,
              cursor: 'pointer',
              userSelect: 'none'
            }}
            onClick={() => setDetailOpen(true)}
          >
            {task.title}
          </Typography.Text>

          {/* Badges */}
          <Space size={4} style={{ flexShrink: 0 }}>
            <Tag
              color={priorityConfig[task.priority].color}
              style={{ fontSize: 11, padding: '0 4px', lineHeight: '18px', margin: 0 }}
            >
              {priorityConfig[task.priority].label}
            </Tag>

            {dueDateLabel && (
              <Tag
                icon={
                  isOverdue ? (
                    <ExclamationCircleOutlined />
                  ) : (
                    <CalendarOutlined />
                  )
                }
                color={isOverdue ? 'error' : 'default'}
                style={{ fontSize: 11, padding: '0 4px', lineHeight: '18px', margin: 0 }}
              >
                {dueDateLabel}
              </Tag>
            )}

            {hasSubTasks && (
              <Tag
                style={{ fontSize: 11, padding: '0 4px', lineHeight: '18px', margin: 0 }}
              >
                {subTasks.filter((s) => s.status === 'done').length}/
                {subTasks.length}
              </Tag>
            )}
          </Space>

          {/* Actions */}
          <Space size={2} style={{ flexShrink: 0 }}>
            {depth === 0 && (
              <Tooltip title="添加子任务">
                <Button
                  type="text"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => setAddSubOpen(true)}
                  style={{ color: '#bfbfbf' }}
                />
              </Tooltip>
            )}
            <Tooltip title="编辑">
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={() => setEditOpen(true)}
                style={{ color: '#bfbfbf' }}
              />
            </Tooltip>
            <Popconfirm
              title="删除此任务？"
              description="子任务也会一并删除。"
              onConfirm={handleDelete}
              okText="删除"
              okButtonProps={{ danger: true }}
              cancelText="取消"
            >
              <Tooltip title="删除">
                <Button
                  type="text"
                  size="small"
                  icon={<DeleteOutlined />}
                  style={{ color: '#bfbfbf' }}
                />
              </Tooltip>
            </Popconfirm>
          </Space>
        </div>

        {/* Sub-tasks */}
        {expanded && hasSubTasks && (
          <div style={{ marginTop: 4 }}>
            {subTasks.map((sub) => (
              <TaskItem key={sub.id} task={sub} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>

      {/* Task detail drawer */}
      <TaskDetail
        task={task}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
      />

      {/* Edit modal */}
      <TaskForm
        open={editOpen}
        task={task}
        onClose={() => setEditOpen(false)}
      />

      {/* Add sub-task modal */}
      <TaskForm
        open={addSubOpen}
        projectId={task.project_id}
        parentId={task.id}
        onClose={() => setAddSubOpen(false)}
        onSuccess={() => setExpanded(true)}
      />
    </div>
  )
}

export default TaskItem
