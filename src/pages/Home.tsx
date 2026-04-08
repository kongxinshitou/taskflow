import React, { useState } from 'react'
import { Typography, Button, Spin, Empty, Divider, Tag, Space } from 'antd'
import { PlusOutlined, CalendarOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import isToday from 'dayjs/plugin/isToday'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useTaskStore } from '../store/taskStore'
import { useProjectStore } from '../store/projectStore'
import TaskItem from '../components/TaskItem'
import TaskForm from '../components/TaskForm'

dayjs.extend(isToday)
dayjs.extend(relativeTime)

const Home: React.FC = () => {
  const [addOpen, setAddOpen] = useState(false)
  const { tasks, loading } = useTaskStore()
  const { projects } = useProjectStore()

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayTs = today.getTime()

  const todayTasks = tasks
    .filter((t) => {
      if (!t.due_date || t.parent_id) return false
      return t.due_date <= Date.now() || t.due_date < todayTs + 86400000
    })
    .filter((t) => {
      // Show today and overdue tasks
      const d = new Date(t.due_date!)
      d.setHours(0, 0, 0, 0)
      return d.getTime() <= todayTs
    })
    .sort((a, b) => {
      // Undone first, then by priority
      if (a.status === 'done' && b.status !== 'done') return 1
      if (a.status !== 'done' && b.status === 'done') return -1
      const po = { high: 0, medium: 1, low: 2 }
      return po[a.priority] - po[b.priority]
    })

  const overdueTasks = todayTasks.filter((t) => {
    const d = new Date(t.due_date!)
    d.setHours(0, 0, 0, 0)
    return d.getTime() < todayTs && t.status !== 'done'
  })

  const todayOnlyTasks = todayTasks.filter((t) => {
    const d = new Date(t.due_date!)
    d.setHours(0, 0, 0, 0)
    return d.getTime() === todayTs
  })

  const allTasks = [
    ...overdueTasks,
    ...todayOnlyTasks.filter((t) => !overdueTasks.find((o) => o.id === t.id))
  ]

  const pendingCount = allTasks.filter((t) => t.status !== 'done').length

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '24px 32px', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 24 }}>
        <div style={{ flex: 1 }}>
          <Typography.Title level={2} style={{ margin: 0, color: '#1a1a1a' }}>
            Today
          </Typography.Title>
          <Typography.Text style={{ color: '#8c8c8c', fontSize: 14 }}>
            {dayjs().format('dddd, MMMM D, YYYY')}
            {pendingCount > 0 && (
              <Tag color="blue" style={{ marginLeft: 12 }}>
                {pendingCount} pending
              </Tag>
            )}
          </Typography.Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setAddOpen(true)}
          disabled={projects.length === 0}
        >
          Add Task
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
          <Spin size="large" />
        </div>
      ) : allTasks.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div>
                <p style={{ color: '#8c8c8c', marginBottom: 8 }}>No tasks due today</p>
                <p style={{ color: '#bfbfbf', fontSize: 12 }}>
                  Tasks with today's due date will appear here
                </p>
              </div>
            }
          >
            {projects.length > 0 && (
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddOpen(true)}>
                Add Task
              </Button>
            )}
            {projects.length === 0 && (
              <Typography.Text style={{ color: '#bfbfbf', fontSize: 12 }}>
                Create a project from the sidebar to get started
              </Typography.Text>
            )}
          </Empty>
        </div>
      ) : (
        <div>
          {overdueTasks.length > 0 && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Tag color="error">Overdue</Tag>
                <Typography.Text style={{ fontSize: 12, color: '#8c8c8c' }}>
                  {overdueTasks.length} task{overdueTasks.length > 1 ? 's' : ''} past due
                </Typography.Text>
              </div>
              {overdueTasks.map((task) => {
                const project = projects.find((p) => p.id === task.project_id)
                return (
                  <div key={task.id}>
                    {project && (
                      <Typography.Text
                        style={{ fontSize: 11, color: project.color, fontWeight: 600, marginLeft: 32, display: 'block', marginBottom: 2 }}
                      >
                        {project.name}
                      </Typography.Text>
                    )}
                    <TaskItem task={task} />
                  </div>
                )
              })}
              {todayOnlyTasks.length > 0 && (
                <Divider style={{ margin: '16px 0' }}>
                  <Space>
                    <CalendarOutlined style={{ color: '#1677ff' }} />
                    <span style={{ fontSize: 12, color: '#8c8c8c' }}>Due Today</span>
                  </Space>
                </Divider>
              )}
            </>
          )}

          {todayOnlyTasks
            .filter((t) => !overdueTasks.find((o) => o.id === t.id))
            .map((task) => {
              const project = projects.find((p) => p.id === task.project_id)
              return (
                <div key={task.id}>
                  {project && (
                    <Typography.Text
                      style={{ fontSize: 11, color: project.color, fontWeight: 600, marginLeft: 32, display: 'block', marginBottom: 2 }}
                    >
                      {project.name}
                    </Typography.Text>
                  )}
                  <TaskItem task={task} />
                </div>
              )
            })}
        </div>
      )}

      <TaskForm
        open={addOpen}
        onClose={() => setAddOpen(false)}
      />
    </div>
  )
}

export default Home
