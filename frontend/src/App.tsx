import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import LoginPage from '@/features/auth/pages/LoginPage';
import RegisterPage from '@/features/auth/pages/RegisterPage';
import DashboardLayout from '@/layouts/DashboardLayout';
import KanbanPage from '@/features/tasks/pages/KanbanPage';
import { DashboardPage } from '@/features/dashboard/components/DashboardPage';
import { AttendancePage } from '@/features/attendance/components/AttendancePage';
import { QuickTasksPage } from '@/features/quick-tasks/components/QuickTasksPage';
import { ProjectListPage } from '@/features/projects/pages/ProjectListPage';
import { ProjectDetailPage } from '@/features/projects/pages/ProjectDetailPage';
import { SprintDetailPage } from '@/features/sprints/pages/SprintDetailPage';
import { MeetingsListPage } from '@/features/meetings/pages/MeetingsListPage';
import { MeetingRoomPage } from '@/features/meetings/pages/MeetingRoomPage';
import { MeetingReportPage } from '@/features/meetings/pages/MeetingReportPage';
import { PreMeetingPage } from '@/features/meetings/pages/PreMeetingPage';
import { NotificationsPage } from '@/features/notifications/pages/NotificationsPage';
import { DocumentListPage } from '@/features/documents/pages/DocumentListPage';
import { DocumentEditorPage } from '@/features/documents/pages/DocumentEditorPage';
import { CompanyDocumentsPage } from '@/features/documents/pages/CompanyDocumentsPage';
import { PersistentCallManager } from '@/features/meetings/components/PersistentCallManager';
import { WorkCalendarPage } from '@/features/calendar/pages/WorkCalendarPage';
import { ChatPage } from '@/features/chat/pages/ChatPage';

function App() {
  return (
    <BrowserRouter>
      <PersistentCallManager />
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
        
        {/* Standalone Video Room & Pre-Meeting Setup (Full Screen) */}
        <Route path="/meetings/:id/prepare" element={<PreMeetingPage />} />
        <Route path="/meetings/:id/room" element={<MeetingRoomPage />} />

        {/* Protected Routes */}
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/projects" element={<ProjectListPage />} />
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
          <Route path="/projects/:id/sprints/:sprintId" element={<SprintDetailPage />} />
          <Route path="/tasks" element={<KanbanPage />} />
          <Route path="/tasks/:taskId" element={<KanbanPage />} />
          <Route path="/projects/:projectId/tasks" element={<KanbanPage />} />
          <Route path="/projects/:projectId/tasks/:taskId" element={<KanbanPage />} />
          {/* M3.5: Quick Tasks — Giao việc nhanh */}
          <Route path="/quick-tasks" element={<QuickTasksPage />} />
          {/* M5: Meetings — Cuộc họp trực tuyến & Báo cáo */}
          <Route path="/meetings" element={<MeetingsListPage />} />
          <Route path="/meetings/:id/report" element={<MeetingReportPage />} />
          {/* M6: Documents — Quản lý tài liệu doanh nghiệp */}
          <Route path="/documents" element={<DocumentListPage />} />
          <Route path="/documents/company" element={<CompanyDocumentsPage />} />
          <Route path="/documents/:id" element={<DocumentEditorPage />} />
          {/* M8: Work Calendar — Timeline Lịch làm việc tổng hợp */}
          <Route path="/calendar" element={<WorkCalendarPage />} />
          {/* M9: Real-time Chat — Trò chuyện doanh nghiệp */}
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/chat/:conversationId" element={<ChatPage />} />
          {/* Attendance is open to ALL authenticated roles; tab-level guards run inside the page. */}
          <Route path="/attendance" element={<AttendancePage />} />
          {/* Future route-level guards:
            <Route
              path="/admin"
              element={
                <PermissionGuard allowedRoles={['ADMIN']}>
                  <AdminPage />
                </PermissionGuard>
              }
            />
          */}
        </Route>

        {/* Redirect root to dashboard */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

