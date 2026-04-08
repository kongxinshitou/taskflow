import React, { useEffect, useState, useCallback } from 'react'
import { ConfigProvider, App as AntApp, message } from 'antd'
import { useProjectStore } from './store/projectStore'
import { useTaskStore } from './store/taskStore'
import Sidebar from './components/Sidebar'
import Home from './pages/Home'
import ProjectDetail from './pages/ProjectDetail'
import Settings from './pages/Settings'
import QuickAddBar from './components/QuickAddBar'

type Page = 'home' | 'project' | 'settings'

const AppContent: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('home')
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null)
  const [quickAddOpen, setQuickAddOpen] = useState(false)

  const { fetchProjects } = useProjectStore()
  const { fetchTasks } = useTaskStore()

  const handleNavigate = useCallback((page: Page | 'home' | 'project' | 'settings', projectId?: string) => {
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
        <AppContent />
      </AntApp>
    </ConfigProvider>
  )
}

export default App
