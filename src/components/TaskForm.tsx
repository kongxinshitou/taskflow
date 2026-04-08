import React, { useEffect, useState } from 'react'
import {
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Button,
  Space,
  Tabs,
  Typography
} from 'antd'
import dayjs from 'dayjs'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useTaskStore } from '../store/taskStore'
import { useProjectStore } from '../store/projectStore'
import type { Task, CreateTaskInput, Priority, Status } from '../utils/ipc'
import '../styles/markdown.css'

interface TaskFormProps {
  open: boolean
  task?: Task | null
  projectId?: string
  parentId?: string | null
  onClose: () => void
  onSuccess?: (task: Task) => void
}

interface FormValues {
  title: string
  notes: string
  due_date: dayjs.Dayjs | null
  priority: Priority
  status: Status
  project_id: string
}

const { Option } = Select

const TaskForm: React.FC<TaskFormProps> = ({
  open,
  task,
  projectId,
  parentId,
  onClose,
  onSuccess
}) => {
  const [form] = Form.useForm<FormValues>()
  const [notesValue, setNotesValue] = useState('')
  const { createTask, updateTask } = useTaskStore()
  const { projects } = useProjectStore()
  const isEdit = !!task

  useEffect(() => {
    if (open) {
      if (task) {
        const notes = task.notes ?? ''
        form.setFieldsValue({
          title: task.title,
          notes,
          due_date: task.due_date ? dayjs(task.due_date) : null,
          priority: task.priority,
          status: task.status,
          project_id: task.project_id
        })
        setNotesValue(notes)
      } else {
        form.resetFields()
        form.setFieldsValue({
          priority: 'medium',
          status: 'todo',
          project_id: projectId ?? projects[0]?.id
        })
        setNotesValue('')
      }
    }
  }, [open, task, projectId, projects, form])

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      let result: Task | null

      if (isEdit && task) {
        result = await updateTask({
          id: task.id,
          title: values.title,
          notes: notesValue || null,
          due_date: values.due_date ? values.due_date.valueOf() : null,
          priority: values.priority,
          status: values.status
        })
      } else {
        const input: CreateTaskInput = {
          project_id: projectId ?? values.project_id,
          parent_id: parentId ?? null,
          title: values.title,
          notes: notesValue || null,
          due_date: values.due_date ? values.due_date.valueOf() : null,
          priority: values.priority,
          status: values.status
        }
        result = await createTask(input)
      }

      if (result) {
        onSuccess?.(result)
        onClose()
      }
    } catch {
      // Validation errors handled by antd
    }
  }

  const modalTitle = isEdit ? '编辑任务' : parentId ? '添加子任务' : '新建任务'

  return (
    <Modal
      title={modalTitle}
      open={open}
      onCancel={onClose}
      footer={
        <Space>
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" onClick={handleSubmit}>
            {isEdit ? '保存' : '创建'}
          </Button>
        </Space>
      }
      destroyOnClose
      width={560}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        {!isEdit && !parentId && (
          <Form.Item
            label="所属项目"
            name="project_id"
            rules={[{ required: true, message: '请选择项目' }]}
          >
            <Select placeholder="选择项目">
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
        )}

        <Form.Item
          label="标题"
          name="title"
          rules={[{ required: true, message: '请输入任务标题' }]}
        >
          <Input placeholder="任务标题" maxLength={200} />
        </Form.Item>

        {/* Notes with Markdown preview */}
        <Form.Item label="备注（支持 Markdown）" style={{ marginBottom: 16 }}>
          <Tabs
            size="small"
            style={{ marginBottom: 0 }}
            items={[
              {
                key: 'write',
                label: '编辑',
                children: (
                  <Input.TextArea
                    value={notesValue}
                    onChange={(e) => {
                      setNotesValue(e.target.value)
                      form.setFieldValue('notes', e.target.value)
                    }}
                    placeholder="支持 Markdown 语法，如 **粗体**、- 列表、## 标题、`代码` 等"
                    rows={5}
                    maxLength={5000}
                    style={{ fontFamily: "'Consolas', 'Monaco', monospace", fontSize: 13 }}
                  />
                )
              },
              {
                key: 'preview',
                label: '预览',
                children: (
                  <div
                    style={{
                      minHeight: 112,
                      padding: '8px 12px',
                      border: '1px solid #d9d9d9',
                      borderRadius: 6,
                      background: '#fafafa'
                    }}
                  >
                    {notesValue ? (
                      <div className="md-content">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {notesValue}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <Typography.Text
                        type="secondary"
                        style={{ fontSize: 13, fontStyle: 'italic' }}
                      >
                        暂无内容
                      </Typography.Text>
                    )}
                  </div>
                )
              }
            ]}
          />
        </Form.Item>

        <Space style={{ width: '100%' }} size="middle">
          <Form.Item label="优先级" name="priority" style={{ flex: 1, marginBottom: 0 }}>
            <Select>
              <Option value="high">高</Option>
              <Option value="medium">中</Option>
              <Option value="low">低</Option>
            </Select>
          </Form.Item>

          <Form.Item label="状态" name="status" style={{ flex: 1, marginBottom: 0 }}>
            <Select>
              <Option value="todo">待办</Option>
              <Option value="in_progress">进行中</Option>
              <Option value="done">已完成</Option>
            </Select>
          </Form.Item>
        </Space>

        <Form.Item label="截止日期" name="due_date" style={{ marginTop: 16, marginBottom: 0 }}>
          <DatePicker
            style={{ width: '100%' }}
            showTime={false}
            format="YYYY-MM-DD"
            placeholder="选择截止日期"
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default TaskForm
