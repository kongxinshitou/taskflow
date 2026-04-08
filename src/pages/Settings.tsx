import React, { useState } from 'react'
import {
  Typography,
  Card,
  Button,
  Divider,
  Space,
  Descriptions,
  message as antMessage
} from 'antd'
import {
  ExportOutlined,
  InfoCircleOutlined,
  DatabaseOutlined
} from '@ant-design/icons'
import { dataAPI } from '../utils/ipc'
import { useProjectStore } from '../store/projectStore'
import { useTaskStore } from '../store/taskStore'

const Settings: React.FC = () => {
  const [exporting, setExporting] = useState(false)
  const { projects } = useProjectStore()
  const { tasks } = useTaskStore()

  const handleExport = async () => {
    setExporting(true)
    try {
      const filePath = await dataAPI.export()
      if (filePath) {
        antMessage.success(`数据已导出至：${filePath}`)
      }
    } catch (err) {
      console.error('[Settings] export error:', err)
      antMessage.error('导出失败，请重试')
    } finally {
      setExporting(false)
    }
  }

  const taskStats = {
    total: tasks.filter((t) => !t.parent_id).length,
    done: tasks.filter((t) => !t.parent_id && t.status === 'done').length,
    subtasks: tasks.filter((t) => t.parent_id).length
  }

  return (
    <div
      style={{
        height: '100%',
        overflowY: 'auto',
        padding: '24px 32px'
      }}
    >
      <Typography.Title level={2} style={{ marginBottom: 24 }}>
        设置
      </Typography.Title>

      {/* Data section */}
      <Card
        title={
          <Space>
            <DatabaseOutlined style={{ color: '#1677ff' }} />
            数据管理
          </Space>
        }
        style={{ marginBottom: 20 }}
      >
        <Descriptions column={2} size="small" style={{ marginBottom: 16 }}>
          <Descriptions.Item label="项目数">{projects.length}</Descriptions.Item>
          <Descriptions.Item label="任务数">{taskStats.total}</Descriptions.Item>
          <Descriptions.Item label="已完成">{taskStats.done}</Descriptions.Item>
          <Descriptions.Item label="子任务数">{taskStats.subtasks}</Descriptions.Item>
        </Descriptions>

        <Divider style={{ margin: '16px 0' }} />

        <div>
          <Typography.Title level={5} style={{ marginBottom: 8 }}>
            导出数据
          </Typography.Title>
          <Typography.Text style={{ color: '#8c8c8c', display: 'block', marginBottom: 12 }}>
            将全部项目和任务导出为 JSON 文件，用于备份或迁移。
          </Typography.Text>
          <Button
            type="primary"
            icon={<ExportOutlined />}
            loading={exporting}
            onClick={handleExport}
            disabled={projects.length === 0}
          >
            导出为 JSON
          </Button>
        </div>
      </Card>

      {/* About section */}
      <Card
        title={
          <Space>
            <InfoCircleOutlined style={{ color: '#1677ff' }} />
            关于 TaskFlow
          </Space>
        }
      >
        <Descriptions column={1} size="small">
          <Descriptions.Item label="版本">1.0.0</Descriptions.Item>
          <Descriptions.Item label="平台">Windows（Electron 28）</Descriptions.Item>
          <Descriptions.Item label="数据存储">
            SQLite — %APPDATA%/taskflow/taskflow.db
          </Descriptions.Item>
          <Descriptions.Item label="全局快捷键">
            <Space direction="vertical" size={4}>
              <span>
                <kbd
                  style={{
                    background: '#f5f5f5',
                    border: '1px solid #d9d9d9',
                    borderRadius: 4,
                    padding: '2px 6px',
                    fontSize: 12
                  }}
                >
                  Ctrl + Shift + Space
                </kbd>{' '}
                — 显示/隐藏主窗口
              </span>
              <span>
                <kbd
                  style={{
                    background: '#f5f5f5',
                    border: '1px solid #d9d9d9',
                    borderRadius: 4,
                    padding: '2px 6px',
                    fontSize: 12
                  }}
                >
                  Ctrl + Shift + N
                </kbd>{' '}
                — 快速添加任务
              </span>
            </Space>
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  )
}

export default Settings
