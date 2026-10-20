import React, { useState, useEffect } from 'react';
import { X, Users, Search, Check, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { chatApi } from '../api/chat.api';
import { useChatStore } from '../stores/chat.store';
import { useAuthStore } from '@/stores/auth.store';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

interface UserItem {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  role?: string;
  position?: string | null;
}

interface CreateGroupChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateGroupChatModal: React.FC<CreateGroupChatModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { t } = useTranslation();
  const currentUser = useAuthStore((s) => s.user);
  const { fetchConversations, setActiveConversation } = useChatStore();

  const [groupName, setGroupName] = useState('');
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<UserItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadUsers();
      setGroupName('');
      setSelectedIds([]);
      setSearch('');
    }
  }, [isOpen]);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get<UserItem[]>('/users');
      setUsers(res.data.filter((u) => u.id !== currentUser?.id));
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()),
  );

  const toggleSelectUser = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) {
      toast.error('Vui lòng nhập tên nhóm trò chuyện');
      return;
    }
    if (selectedIds.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 thành viên');
      return;
    }

    setIsSubmitting(true);
    try {
      const newConv = await chatApi.createGroup(groupName.trim(), selectedIds);
      toast.success('Đã tạo nhóm trò chuyện thành công');
      await fetchConversations();
      setActiveConversation(newConv);
      onClose();
    } catch (err) {
      toast.error('Tạo nhóm trò chuyện thất bại');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              {t('chat.create_group_title', 'Tạo nhóm trò chuyện mới')}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleCreateGroup} className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {t('chat.group_name', 'Tên nhóm')} *
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="VD: Nhóm Dự án AI, Nhóm Thiết kế..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              autoFocus
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">
                {t('chat.select_members', 'Chọn thành viên')} ({selectedIds.length})
              </label>
              {selectedIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="text-[11px] text-blue-600 hover:underline cursor-pointer"
                >
                  Bỏ chọn tất cả
                </button>
              )}
            </div>

            {/* Search members */}
            <div className="relative mb-2">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm theo tên hoặc email..."
                className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            {/* User List with Checkboxes */}
            <div className="border border-slate-200 rounded-xl max-h-56 overflow-y-auto divide-y divide-slate-100">
              {isLoading ? (
                <div className="flex items-center justify-center p-6 text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              ) : filteredUsers.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">Không tìm thấy nhân sự phù hợp</p>
              ) : (
                filteredUsers.map((user) => {
                  const isSelected = selectedIds.includes(user.id);
                  return (
                    <div
                      key={user.id}
                      onClick={() => toggleSelectUser(user.id)}
                      className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${
                        isSelected ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${
                          isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>

                      <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xs text-slate-600 overflow-hidden shrink-0">
                        {user.avatar ? (
                          <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                          <span>{user.name.charAt(0).toUpperCase()}</span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate">{user.name}</p>
                        <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Footer Action buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !groupName.trim() || selectedIds.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{t('chat.create_group_button', 'Tạo nhóm')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
