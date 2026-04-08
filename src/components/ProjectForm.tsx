import React, { useEffect } from 'react'
import { Modal, Form, Input, ColorPicker, Button, Space } from 'antd'
import type { Color } from 'antd/es/color-picker'
import { useProjectStore } from '../store/projectStore'
import type { Project } from '../utils/ipc'

interface ProjectFormProps {
  open: boolean
  project?: Project | null  // if provided, edit mode
  onClose: () => void
  onSuccess?: (project: Project) => void
}

interface FormValues {
  name: string
  color: Color | string
  description: string
}

const ProjectForm: React.FC<ProjectFormProps> = ({ open, project, onClose, onSuccess }) => {
  const [form] = Form.useForm<FormValues>()
  const { createProject, updateProject } = useProjectStore()
  const isEdit = !!project

  useEffect(() => {
    if (open) {
      if (project) {
        form.setFieldsValue({
          name: project.name,
          color: project.color,
          description: project.description ?? ''
        })
      } else {
        form.resetFields()
        form.setFieldValue('color', '#1677ff')
      }
    }
  }, [open, project, form])

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      const color =
        typeof values.color === 'string'
          ? values.color
          : (values.color as Color).toHexString()

      let result: Project | null
      if (isEdit && project) {
        result = await updateProject({
          id: project.id,
          name: values.name,
          color,
          description: values.description || undefined
        })
      } else {
        result = await createProject({
          name: values.name,
          color,
          description: values.description || undefined
        })
      }

      if (result) {
        onSuccess?.(result)
        onClose()
      }
    } catch (err) {
      // Form validation error — antd handles display
    }
  }

  return (
    <Modal
      title={isEdit ? 'Edit Project' : 'New Project'}
      open={open}
      onCancel={onClose}
      footer={
        <Space>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" onClick={handleSubmit}>
            {isEdit ? 'Save' : 'Create'}
          </Button>
        </Space>
      }
      destroyOnClose
      width={480}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item
          label="Project Name"
          name="name"
          rules={[{ required: true, message: 'Please enter a project name' }]}
        >
          <Input placeholder="e.g. Work, Personal, Side Project" maxLength={60} />
        </Form.Item>

        <Form.Item label="Color" name="color">
          <ColorPicker
            presets={[
              {
                label: 'Recommended',
                colors: [
                  '#1677ff', '#52c41a', '#faad14', '#f5222d',
                  '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16'
                ]
              }
            ]}
            showText
          />
        </Form.Item>

        <Form.Item label="Description" name="description">
          <Input.TextArea
            placeholder="Optional description"
            rows={3}
            maxLength={200}
            showCount
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default ProjectForm
