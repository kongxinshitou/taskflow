import React, { useEffect } from 'react'
import { Modal, Form, Input, Select, DatePicker } from 'antd'
import { useActivityStore } from '../store/activityStore'
import { useProjectStore } from '../store/projectStore'
import type { Activity } from '../utils/api'
import dayjs from 'dayjs'

interface ActivityFormProps {
  open: boolean
  activity?: Activity | null
  onClose: () => void
}

const sourceOptions = [
  { label: '手动添加', value: 'manual' },
  { label: 'TODO 完成', value: 'todo_completion' },
  { label: 'Claude Session', value: 'claude_session' }
]

const ActivityForm: React.FC<ActivityFormProps> = ({ open, activity, onClose }) => {
  const [form] = Form.useForm()
  const { createActivity, updateActivity } = useActivityStore()
  const { projects, fetchProjects } = useProjectStore()

  useEffect(() => {
    if (open && projects.length === 0) fetchProjects()
  }, [open])

  useEffect(() => {
    if (activity) {
      form.setFieldsValue({
        title: activity.title,
        description: activity.description,
        project_id: activity.project_id || undefined,
        source: activity.source,
        done_at: activity.done_at ? dayjs(activity.done_at) : dayjs()
      })
    } else {
      form.resetFields()
      form.setFieldsValue({ source: 'manual', done_at: dayjs() })
    }
  }, [activity, open])

  const handleSubmit = async () => {
    const values = await form.validateFields()
    const doneAt = values.done_at ? values.done_at.valueOf() : Date.now()

    if (activity) {
      await updateActivity(activity.id, {
        title: values.title,
        description: values.description,
        project_id: values.project_id || null,
        done_at: doneAt
      })
    } else {
      await createActivity({
        title: values.title,
        description: values.description,
        project_id: values.project_id || null,
        source: values.source || 'manual',
        done_at: doneAt
      })
    }
    onClose()
  }

  return (
    <Modal
      title={activity ? '编辑完成记录' : '添加完成记录'}
      open={open}
      onOk={handleSubmit}
      onCancel={onClose}
      okText="保存"
      cancelText="取消"
    >
      <Form form={form} layout="vertical">
        <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}>
          <Input placeholder="完成了什么？" />
        </Form.Item>
        <Form.Item name="description" label="描述">
          <Input.TextArea rows={3} placeholder="详细描述（可选）" />
        </Form.Item>
        <Form.Item name="project_id" label="关联项目">
          <Select allowClear placeholder="选择项目（可选）">
            {projects.map((p) => (
              <Select.Option key={p.id} value={p.id}>
                {p.name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        {!activity && (
          <Form.Item name="source" label="来源">
            <Select options={sourceOptions} />
          </Form.Item>
        )}
        <Form.Item name="done_at" label="完成时间">
          <DatePicker showTime style={{ width: '100%' }} />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default ActivityForm
