import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import LoginPage from '@/features/auth/pages/LoginPage';
import RegisterPage from '@/features/auth/pages/RegisterPage';
import DashboardLayout from '@/layouts/DashboardLayout';
import KanbanPage from '@/features/tasks/pages/KanbanPage';

function App() {
  return (
    <BrowserRouter>
      <Toaster 
        position="top-right" 
        closeButton 
        expand={false} 
        toastOptions={{
          className: 'bg-card border border-border rounded-md shadow-lg',
          descriptionClassName: 'text-xs font-medium text-muted-foreground',
          classNames: {
            toast: 'bg-card border border-border rounded-md shadow-lg',
            title: 'text-sm font-bold text-foreground',
            description: 'text-xs font-medium text-muted-foreground mt-1',
            icon: 'text-primary'
          }
        }}
      />
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        
        {/* Protected Routes */}
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={
            <div className="bauhaus-card p-8">
              <h1 className="text-3xl font-black uppercase text-slate-900 border-b-4 border-primary pb-2 inline-block mb-6">Tổng quan <span className="text-primary">hệ thống</span></h1>
              <p className="text-slate-600 font-medium">Chào mừng bạn quay lại hệ thống. Nội dung dashboard chi tiết sẽ được xây dựng ở các bước tiếp theo.</p>
            </div>
          } />
          <Route path="/tasks" element={<KanbanPage />} />
          <Route path="/projects/:projectId/tasks" element={<KanbanPage />} />
          {/* Add more features later */}
        </Route>

        {/* Redirect root to dashboard */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

