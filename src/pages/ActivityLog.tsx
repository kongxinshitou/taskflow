import React, { useEffect, useState } from 'react'
import {
  Typography,
  Button,
  Card,
  Tag,
  Empty,
  Space,
  Popconfirm,
  Select,
  Timeline
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined
} from '@ant-design/icons'
import { useActivityStore } from '../store/activityStore'
import { useProjectStore } from '../store/projectStore'
import ActivityForm from '../components/ActivityForm'
import type { Activity } from '../utils/api'

const sourceLabels: Record<string, { text: string; color: string }> = {
  manual: { text: '手动添加', color: 'blue' },
  todo_completion: { text: 'TODO 完成', color: 'green' },
  claude_session: { text: 'Claude Session', color: 'purple' }
}

const ActivityLog: React.FC = () => {
  const { activities, loading, fetchActivities, deleteActivity } = useActivityStore()
  const { projects, fetchProjects } = useProjectStore()
  const [formOpen, setFormOpen] = useState(false)
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null)
  const [filterSource, setFilterSource] = useState<string | undefined>()

  useEffect(() => {
    fetchActivities()
    if (projects.length === 0) fetchProjects()
  }, [])

  const filteredActivities = filterSource
    ? activities.filter((a) => a.source === filterSource)
    : activities

  // Group by date
  const groupedByDate: Record<string, Activity[]> = {}
  filteredActivities.forEach((a) => {
    const date = new Date(a.done_at).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    })
    if (!groupedByDate[date]) groupedByDate[date] = []
    groupedByDate[date].push(a)
  })

  const getProjectName = (projectId: string | null) => {
    if (!projectId) return null
    return projects.find((p) => p.id === projectId)?.name
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '24px 32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Typography.Title level={2} style={{ margin: 0 }}>
          完成记录
        </Typography.Title>
        <Space>
          <Select
            allowClear
            placeholder="筛选来源"
            style={{ width: 150 }}
            value={filterSource}
            onChange={setFilterSource}
          >
            <Select.Option value="manual">手动添加</Select.Option>
            <Select.Option value="todo_completion">TODO 完成</Select.Option>
            <Select.Option value="claude_session">Claude Session</Select.Option>
          </Select>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingActivity(null)
              setFormOpen(true)
            }}
          >
            添加记录
          </Button>
        </Space>
      </div>

      {filteredActivities.length === 0 ? (
        <Empty description="暂无完成记录" />
      ) : (
        Object.entries(groupedByDate).map(([date, items]) => (
          <Card
            key={date}
            title={
              <Space>
                <CheckCircleOutlined style={{ color: '#52c41a' }} />
                <span>{date}</span>
                <Tag>{items.length} 项</Tag>
              </Space>
            }
            style={{ marginBottom: 16 }}
          >
            <Timeline
              items={items.map((a) => ({
                color: a.source === 'todo_completion' ? 'green' : 'blue',
                children: (
                  <div
                    key={a.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, marginBottom: 4 }}>
                        {a.title}
                        <Tag
                          color={sourceLabels[a.source]?.color || 'default'}
                          style={{ marginLeft: 8 }}
                        >
                          {sourceLabels[a.source]?.text || a.source}
                        </Tag>
                        {a.project_id && (
                          <Tag color="geekblue" style={{ marginLeft: 4 }}>
                            {getProjectName(a.project_id)}
                          </Tag>
                        )}
                      </div>
                      {a.description && (
                        <div style={{ color: '#8c8c8c', fontSize: 13 }}>{a.description}</div>
                      )}
                      <div style={{ color: '#bfbfbf', fontSize: 12, marginTop: 4 }}>
                        {new Date(a.done_at).toLocaleTimeString('zh-CN', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                    <Space size={4}>
                      <Button
                        type="text"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => {
                          setEditingActivity(a)
                          setFormOpen(true)
                        }}
                      />
                      <Popconfirm
                        title="确定删除此记录？"
                        onConfirm={() => deleteActivity(a.id)}
                        okText="删除"
                        cancelText="取消"
                      >
                        <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                      </Popconfirm>
                    </Space>
                  </div>
                )
              }))}
          </Card>
        ))
      )}

      <ActivityForm
        open={formOpen}
        activity={editingActivity}
        onClose={() => {
          setFormOpen(false)
          setEditingActivity(null)
        }}
      />
    </div>
  )
}

export default ActivityLog
