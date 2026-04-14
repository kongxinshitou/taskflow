import React, { useEffect, useState, useCallback } from 'react'
import { ConfigProvider, App as AntApp, Spin } from 'antd'
import { useProjectStore } from './store/projectStore'
import { useTaskStore } from './store/taskStore'
import { useAuthStore } from './store/authStore'
import Sidebar from './components/Sidebar'
import Home from './pages/Home'
import ProjectDetail from './pages/ProjectDetail'
import Settings from './pages/Settings'
import ActivityLog from './pages/ActivityLog'
import Login from './pages/Login'
import Register from './pages/Register'
import QuickAddBar from './components/QuickAddBar'
import { useScheduler } from './hooks/useScheduler'

type Page = 'home' | 'project' | 'settings' | 'activity'

const AppContent: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('home')
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null)
  const [quickAddOpen, setQuickAddOpen] = useState(false)

  // Start due-date notification scheduler
  useScheduler()

  const { fetchProjects } = useProjectStore()
  const { fetchTasks } = useTaskStore()

  const handleNavigate = useCallback((page: Page | 'home' | 'project' | 'settings' | 'activity', projectId?: string) => {
    setCurrentPage(page as Page)
    setCurrentProjectId(projectId ?? null)
  }, [])

  useEffect(() => {
    // Load initial data
    const init = async () => {
      await fetchProjects()
      await fetchTasks()
    }
    init()
  }, [])

  useEffect(() => {
    // Listen for quick-add shortcut from main process
    if (window.electronAPI?.onQuickAddOpen) {
      const unsubscribe = window.electronAPI.onQuickAddOpen(() => {
        setQuickAddOpen(true)
      })
      return unsubscribe
    }
  }, [])

  useEffect(() => {
    // Navigate to project when a due-date notification is clicked
    if (window.electronAPI?.onNavigateToProject) {
      const unsubscribe = window.electronAPI.onNavigateToProject((projectId) => {
        handleNavigate('project', projectId)
      })
      return unsubscribe
    }
  }, [handleNavigate])

  const renderContent = () => {
    switch (currentPage) {
      case 'home':
        return <Home />
      case 'project':
        if (!currentProjectId) return <Home />
        return (
          <ProjectDetail
            projectId={currentProjectId}
            onProjectDeleted={() => handleNavigate('home')}
          />
        )
      case 'activity':
        return <ActivityLog />
      case 'settings':
        return <Settings />
      default:
        return <Home />
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        overflow: 'hidden',
        fontFamily: "-apple-system, 'Segoe UI', sans-serif",
        background: '#fff'
      }}
    >
      <Sidebar
        onNavigate={handleNavigate}
        currentPage={currentPage}
        currentProjectId={currentProjectId}
      />

      <main
        style={{
          flex: 1,
          overflow: 'hidden',
          background: '#fff'
        }}
      >
        {renderContent()}
      </main>

      <QuickAddBar
        open={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
      />
    </div>
  )
}

// Auth wrapper: Electron without token uses local data, Web without token must login
const isElectron = typeof window !== 'undefined' && !!window.electronAPI

const AuthWrapper: React.FC = () => {
  const { token, initialized, init } = useAuthStore()
  const [showRegister, setShowRegister] = useState(false)

  useEffect(() => {
    // Only verify token when logged in; skip auth init for Electron local mode
    if (isElectron && !localStorage.getItem('taskflow_token')) return
    init()
  }, [])

  if (!initialized && (token || !isElectron)) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" />
      </div>
    )
  }

  // No token in Electron → use local data directly
  if (!token && isElectron) {
    return <AppContent />
  }

  // No token in Web → show login/register
  if (!token) {
    if (showRegister) {
      return <Register onSwitchToLogin={() => setShowRegister(false)} />
    }
    return <Login onSwitchToRegister={() => setShowRegister(true)} />
  }

  return <AppContent />
}

const App: React.FC = () => {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1677ff',
          fontFamily: "-apple-system, 'Segoe UI', sans-serif",
          borderRadius: 8
        }
      }}
    >
      <AntApp>
        <AuthWrapper />
      </AntApp>
    </ConfigProvider>
  )
}

export default App
