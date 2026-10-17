/**
 * QuickTaskButton — M3.5
 * Nút ⚡ trên header để mở QuickTaskModal.
 * Chỉ hiển thị cho PM / DEPARTMENT_HEAD / ADMIN.
 */
import { useState } from 'react';
import { Zap } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { QuickTaskModal } from './QuickTaskModal';

export function QuickTaskButton() {
  const { user, hasAnyRole } = useAuthStore();
  const [open, setOpen] = useState(false);

  // RBAC: chỉ PM, DEPT_HEAD, Admin mới thấy nút
  const allowed = hasAnyRole(['PM', 'DEPARTMENT_HEAD', 'ADMIN']);
  if (!allowed) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative inline-flex items-center justify-center h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-sm hover:shadow-md transition-all hover:scale-[1.04] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:ring-offset-2"
        title={
          user?.role === 'DEPARTMENT_HEAD'
            ? 'Giao việc nhanh cho phòng ban'
            : 'Giao việc nhanh'
        }
        aria-label="Mở giao việc nhanh"
        data-testid="quick-task-button"
      >
        <Zap className="w-4 h-4 transition-transform group-hover:scale-110" strokeWidth={2.5} />
        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400 border border-white" />
      </button>

      <QuickTaskModal isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
}
