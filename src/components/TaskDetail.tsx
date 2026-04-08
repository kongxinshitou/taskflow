import React, { useState } from 'react'
import {
  Drawer,
  Tag,
  Space,
  Typography,
  Button,
  Checkbox,
  Divider,
  Empty,
  Progress,
  Tooltip
} from 'antd'
import {
  EditOutlined,
  CalendarOutlined,
  ExclamationCircleOutlined,
  PlusOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useTaskStore } from '../store/taskStore'
import type { Task } from '../utils/ipc'
import TaskForm from './TaskForm'
import '../styles/markdown.css'

interface TaskDetailProps {
  task: Task | null
  open: boolean
  onClose: () => void
}

const priorityConfig = {
  high: { color: 'red', label: '高' },
  medium: { color: 'orange', label: '中' },
  low: { color: 'green', label: '低' }
}

const statusConfig = {
  todo: { color: 'default', label: '待办' },
  in_progress: { color: 'processing', label: '进行中' },
  done: { color: 'success', label: '已完成' }
}

const TaskDetail: React.FC<TaskDetailProps> = ({ task, open, onClose }) => {
  const [editOpen, setEditOpen] = useState(false)
  const [addSubOpen, setAddSubOpen] = useState(false)
  const { getSubTasks, toggleTaskStatus } = useTaskStore()

  if (!task) return null

  const subTasks = getSubTasks(task.id)
  const doneCount = subTasks.filter((s) => s.status === 'done').length
  const isDone = task.status === 'done'
  const isOverdue = task.due_date && task.due_date < Date.now() && !isDone
  const progress =
    subTasks.length > 0 ? Math.round((doneCount / subTasks.length) * 100) : 0

  return (
    <>
      <Drawer
        title={
          <Space size={6}>
            <Tag
              color={priorityConfig[task.priority].color}
              style={{ margin: 0 }}
            >
              {priorityConfig[task.priority].label}优先
            </Tag>
            <Tag
              color={statusConfig[task.status].color}
              style={{ margin: 0 }}
            >
              {statusConfig[task.status].label}
            </Tag>
          </Space>
        }
        open={open}
        onClose={onClose}
        width={480}
        styles={{ body: { padding: '16px 24px' } }}
        extra={
          <Tooltip title="编辑任务">
            <Button
              icon={<EditOutlined />}
              onClick={() => setEditOpen(true)}
            >
              编辑
            </Button>
          </Tooltip>
        }
      >
        {/* Task title */}
        <Typography.Title
          level={4}
          style={{
            marginTop: 0,
            marginBottom: 8,
            textDecoration: isDone ? 'line-through' : 'none',
            color: isDone ? '#bfbfbf' : '#1a1a1a'
          }}
        >
          {task.title}
        </Typography.Title>

        {/* Due date */}
        {task.due_date && (
          <div style={{ marginBottom: 12 }}>
            <Tag
              icon={
                isOverdue ? (
                  <ExclamationCircleOutlined />
                ) : (
                  <CalendarOutlined />
                )
              }
              color={isOverdue ? 'error' : 'blue'}
            >
              截止日期：{dayjs(task.due_date).format('YYYY-MM-DD')}
              {isOverdue && '（已逾期）'}
            </Tag>
          </div>
        )}

        <Divider style={{ margin: '16px 0' }} />

        {/* Notes — Markdown rendered */}
        <Typography.Text
          type="secondary"
          style={{ fontSize: 12, display: 'block', marginBottom: 8 }}
        >
          备注
        </Typography.Text>
        {task.notes ? (
          <div className="md-content">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {task.notes}
            </ReactMarkdown>
          </div>
        ) : (
          <Typography.Text
            type="secondary"
            style={{ fontSize: 13, fontStyle: 'italic' }}
          >
            暂无备注
          </Typography.Text>
        )}

        <Divider style={{ margin: '16px 0' }} />

        {/* Sub-tasks section */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 10
          }}
        >
          <Typography.Text strong style={{ fontSize: 13 }}>
            子任务
            {subTasks.length > 0 && (
              <Typography.Text
                type="secondary"
                style={{ fontSize: 12, fontWeight: 400, marginLeft: 6 }}
              >
                {doneCount}/{subTasks.length}
              </Typography.Text>
            )}
          </Typography.Text>
          <Button
            size="small"
            icon={<PlusOutlined />}
            onClick={() => setAddSubOpen(true)}
          >
            添加
          </Button>
        </div>

        {subTasks.length > 0 && (
          <Progress
            percent={progress}
            size="small"
            style={{ marginBottom: 10 }}
            strokeColor="#1677ff"
          />
        )}

        {subTasks.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="暂无子任务"
            style={{ margin: '8px 0 0', padding: 0 }}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {subTasks.map((sub) => (
              <div
                key={sub.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '7px 10px',
                  background: '#fafafa',
                  borderRadius: 6,
                  border: '1px solid #f0f0f0'
                }}
              >
                <Checkbox
                  checked={sub.status === 'done'}
                  onChange={() => toggleTaskStatus(sub)}
                />
                <Typography.Text
                  style={{
                    flex: 1,
                    fontSize: 13,
                    textDecoration:
                      sub.status === 'done' ? 'line-through' : 'none',
                    color: sub.status === 'done' ? '#bfbfbf' : '#262626'
                  }}
                >
                  {sub.title}
                </Typography.Text>
                <Tag
                  color={priorityConfig[sub.priority].color}
                  style={{ fontSize: 11, padding: '0 4px', lineHeight: '18px', margin: 0 }}
                >
                  {priorityConfig[sub.priority].label}
                </Tag>
              </div>
            ))}
          </div>
        )}
      </Drawer>

      <TaskForm
        open={editOpen}
        task={task}
        onClose={() => setEditOpen(false)}
      />
      <TaskForm
        open={addSubOpen}
        projectId={task.project_id}
        parentId={task.id}
        onClose={() => setAddSubOpen(false)}
      />
    </>
  )
}

export default TaskDetail
