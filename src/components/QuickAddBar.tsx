import React, { useEffect, useRef } from 'react'
import { Modal, Form, Input, Select, Button, Space, message } from 'antd'
import { useTaskStore } from '../store/taskStore'
import { useProjectStore } from '../store/projectStore'
import type { Priority } from '../utils/ipc'

interface QuickAddBarProps {
  open: boolean
  onClose: () => void
}

interface FormValues {
  title: string
  project_id: string
  priority: Priority
}

const { Option } = Select

const QuickAddBar: React.FC<QuickAddBarProps> = ({ open, onClose }) => {
  const [form] = Form.useForm<FormValues>()
  const { createTask } = useTaskStore()
  const { projects } = useProjectStore()
  const inputRef = useRef<any>(null)

  useEffect(() => {
    if (open) {
      form.resetFields()
      form.setFieldsValue({
        priority: 'medium',
        project_id: projects[0]?.id
      })
      // Auto-focus input
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open, projects, form])

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      const task = await createTask({
        project_id: values.project_id,
        title: values.title,
        priority: values.priority,
        status: 'todo'
      })
      if (task) {
        message.success('任务已创建')
        onClose()
      }
    } catch {
      // validation handled by antd
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
    if (e.key === 'Escape') {
      onClose()
    }
  }

  if (projects.length === 0) {
    return (
      <Modal
        open={open}
        title="快速新建任务"
        onCancel={onClose}
        footer={<Button onClick={onClose}>关闭</Button>}
        width={480}
      >
        <p style={{ color: '#8c8c8c', padding: '16px 0' }}>
          请先创建项目，再添加任务。
        </p>
      </Modal>
    )
  }

  return (
    <Modal
      open={open}
      title="快速新建任务"
      onCancel={onClose}
      footer={
        <Space>
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" onClick={handleSubmit}>
            创建
          </Button>
        </Space>
      }
      width={480}
      destroyOnClose
      style={{ top: '30%' }}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }} onKeyDown={handleKeyDown}>
        <Form.Item
          name="title"
          rules={[{ required: true, message: '请输入任务标题' }]}
        >
          <Input
            ref={inputRef}
            placeholder="任务标题…（回车快速创建）"
            size="large"
            maxLength={200}
          />
        </Form.Item>

        <Space style={{ width: '100%' }}>
          <Form.Item
            name="project_id"
            label="所属项目"
            rules={[{ required: true, message: '请选择项目' }]}
            style={{ flex: 1 }}
          >
            <Select>
              {projects.map((p) => (
                <Option key={p.id} value={p.id}>
                  <Space>
                    <span
                      style={{
                        display: 'inline-block',
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: p.color
                      }}
                    />
                    {p.name}
                  </Space>
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="priority" label="优先级" style={{ flex: 1 }}>
            <Select>
              <Option value="high">高</Option>
              <Option value="medium">中</Option>
              <Option value="low">低</Option>
            </Select>
          </Form.Item>
        </Space>
      </Form>
    </Modal>
  )
}

export default QuickAddBar
