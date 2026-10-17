import React, { useEffect, useState } from 'react';
import { X, UserPlus, AlertCircle } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { projectApi } from '../api/project.api';

interface AssignableUser {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  role: string;
  department?: { id: string; name: string } | null;
}

interface AddMemberModalProps {
  projectId: string;
  existingMemberIds: string[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddMemberModal: React.FC<AddMemberModalProps> = ({
  projectId,
  existingMemberIds,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [users, setUsers] = useState<AssignableUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [projectRole, setProjectRole] = useState('MEMBER');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const fetchUsers = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await apiClient.get<AssignableUser[]>('/users/assignable');
        setUsers(res.data || []);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Lỗi khi tải danh sách nhân sự';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUsers();
  }, [isOpen]);

  if (!isOpen) return null;

  const availableUsers = users.filter((u) => !existingMemberIds.includes(u.id));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      setError('Vui lòng chọn nhân sự');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await projectApi.addMember(projectId, selectedUserId, projectRole);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Không thể thêm thành viên';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Thêm Thành Viên</h3>
              <p className="text-xs text-slate-500">Gán nhân sự vào dự án</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* User selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Chọn Nhân Sự <span className="text-rose-500">*</span>
            </label>
            {isLoading ? (
              <div className="text-xs text-slate-400 py-2">Đang tải danh sách nhân sự...</div>
            ) : availableUsers.length === 0 ? (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
                Tất cả nhân sự khả dụng đã tham gia dự án này.
              </div>
            ) : (
              <select
                required
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900"
              >
                <option value="">-- Chọn nhân viên --</option>
                {availableUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email}) - {u.role}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Role selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Vai Trò Trong Dự Án (Project Role)
            </label>
            <select
              value={projectRole}
              onChange={(e) => setProjectRole(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900"
            >
              <option value="MEMBER">Member (Thành viên thực thi)</option>
              <option value="LEAD">Technical Lead / Tech Owner</option>
              <option value="QA">QA / Tester</option>
              <option value="DESIGNER">UI/UX Designer</option>
              <option value="DEVOPS">DevOps / Infra</option>
              <option value="PM">Project Manager (PM)</option>
            </select>
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting || availableUsers.length === 0}
              className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-98 rounded-xl shadow-xs transition-all flex items-center gap-2"
            >
              {isSubmitting ? 'Đang thêm...' : 'Thêm Thành Viên'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
