import React, { useState, useEffect } from 'react'
import {
  Typography,
  Card,
  Button,
  Divider,
  Space,
  Descriptions,
  Input,
  message as antMessage
} from 'antd'
import {
  ExportOutlined,
  InfoCircleOutlined,
  DatabaseOutlined,
  CloudServerOutlined,
  CheckCircleOutlined
} from '@ant-design/icons'
import { dataAPI } from '../utils/ipc'
import { getApiBaseUrl, setApiBaseUrl } from '../utils/api'
import { useProjectStore } from '../store/projectStore'
import { useTaskStore } from '../store/taskStore'
import { useAuthStore } from '../store/authStore'

const Settings: React.FC = () => {
  const [exporting, setExporting] = useState(false)
  const [serverUrl, setServerUrl] = useState(getApiBaseUrl())
  const [testing, setTesting] = useState(false)
  const { projects } = useProjectStore()
  const { tasks } = useTaskStore()
  const { token } = useAuthStore()

  useEffect(() => {
    setServerUrl(getApiBaseUrl())
  }, [])

  const handleTestConnection = async () => {
    setTesting(true)
    try {
      const res = await fetch(`${serverUrl.replace(/\/+$/, '')}/auth/me`)
      // 401 means server is reachable but needs auth — that's OK
      if (res.status === 401 || res.status === 200) {
        antMessage.success('连接成功')
      } else {
        antMessage.warning(`服务器响应异常：${res.status}`)
      }
    } catch {
      antMessage.error('连接失败，请检查地址')
    } finally {
      setTesting(false)
    }
  }

  const handleSaveUrl = () => {
    setApiBaseUrl(serverUrl)
    antMessage.success('服务器地址已保存')
  }

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

      {/* Server settings */}
      <Card
        title={
          <Space>
            <CloudServerOutlined style={{ color: '#1677ff' }} />
            服务器设置
          </Space>
        }
        style={{ marginBottom: 20 }}
      >
        <Typography.Text style={{ color: '#8c8c8c', display: 'block', marginBottom: 12 }}>
          配置 TaskFlow 后端 API 服务器地址。登录后将使用云端数据，未登录时（Electron）使用本地数据。
        </Typography.Text>
        <Space.Compact style={{ width: '100%', marginBottom: 12 }}>
          <Input
            value={serverUrl}
            onChange={(e) => setServerUrl(e.target.value)}
            placeholder="http://localhost:8080/api"
          />
          <Button onClick={handleTestConnection} loading={testing}>
            测试连接
          </Button>
          <Button type="primary" onClick={handleSaveUrl}>
            保存
          </Button>
        </Space.Compact>
        <Space>
          <CheckCircleOutlined style={{ color: token ? '#52c41a' : '#faad14' }} />
          <Typography.Text style={{ color: '#8c8c8c' }}>
            当前数据源：{token ? `云端 (${getApiBaseUrl()})` : '本地 (Electron SQLite)'}
          </Typography.Text>
        </Space>
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
          <Descriptions.Item label="版本">1.0.1</Descriptions.Item>
          <Descriptions.Item label="平台">Windows（Electron 28）</Descriptions.Item>
          <Descriptions.Item label="数据存储">
            {token ? `云端服务器 — ${getApiBaseUrl()}` : '本地 — %APPDATA%/taskflow/taskflow.db'}
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
