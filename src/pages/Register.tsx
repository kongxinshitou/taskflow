import React, { useState } from 'react'
import { Form, Input, Button, Card, Typography, message, Space } from 'antd'
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons'
import { useAuthStore } from '../store/authStore'

interface RegisterProps {
  onSwitchToLogin: () => void
}

const Register: React.FC<RegisterProps> = ({ onSwitchToLogin }) => {
  const [loading, setLoading] = useState(false)
  const register = useAuthStore((s) => s.register)

  const onFinish = async (values: { username: string; password: string; email?: string }) => {
    setLoading(true)
    const success = await register(values.username, values.password, values.email)
    setLoading(false)
    if (!success) {
      message.error('注册失败，用户名可能已存在')
    }
  }

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f5f5f5'
      }}
    >
      <Card style={{ width: 400, borderRadius: 12 }}>
        <Typography.Title level={3} style={{ textAlign: 'center', marginBottom: 32 }}>
          注册 TaskFlow
        </Typography.Title>

        <Form onFinish={onFinish} size="large">
          <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }, { min: 2, message: '至少 2 个字符' }]}>
            <Input prefix={<UserOutlined />} placeholder="用户名" />
          </Form.Item>
          <Form.Item name="email" rules={[{ type: 'email', message: '请输入有效的邮箱地址' }]}>
            <Input prefix={<MailOutlined />} placeholder="邮箱（可选）" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }, { min: 6, message: '至少 6 个字符' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="密码" />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            dependencies={['password']}
            rules={[
              { required: true, message: '请确认密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve()
                  }
                  return Promise.reject(new Error('两次密码不一致'))
                }
              })
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="确认密码" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              注册
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center' }}>
          <Space>
            <Typography.Text style={{ color: '#8c8c8c' }}>已有账号？</Typography.Text>
            <Button type="link" onClick={onSwitchToLogin} style={{ padding: 0 }}>
              去登录
            </Button>
          </Space>
        </div>
      </Card>
    </div>
  )
}

export default Register
