import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Building2,
  X,
  Search,
  UserMinus,
  UserPlus,
  Trash2,
  FolderKanban,
  Users,
  Save,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { adminApi } from '../api/admin.api';
import type { AdminDepartmentItem, AdminUserItem } from '../types/admin.types';

interface DepartmentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  department: AdminDepartmentItem | null;
  allUsers: AdminUserItem[];
  onDepartmentUpdated: () => void;
}

export const DepartmentDetailModal: React.FC<DepartmentDetailModalProps> = ({
  isOpen,
  onClose,
  department,
  allUsers,
  onDepartmentUpdated,
}) => {
  const { i18n } = useTranslation();
  const isVi = i18n.language.startsWith('vi');

  const [activeTab, setActiveTab] = useState<'info' | 'members' | 'projects'>('info');

  // Form states for editable fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [managerId, setManagerId] = useState('');
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Search in members tab
  const [memberQuery, setMemberQuery] = useState('');

  // Add member dropdown state
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [addMemberSearch, setAddMemberSearch] = useState('');

  // Sync state when department changes
  useEffect(() => {
    if (department) {
      setName(department.name);
      setDescription(department.description || '');
      setManagerId(department.managerId || '');
      setMemberIds(department.users ? department.users.map((u) => u.id) : []);
      setActiveTab('info');
      setShowDeleteConfirm(false);
    }
  }, [department]);

  // Selected manager object
  const selectedManager = useMemo(
    () => allUsers.find((u) => u.id === managerId),
    [allUsers, managerId],
  );

  // Head search state
  const [headSearch, setHeadSearch] = useState('');
  const [isHeadDropdownOpen, setIsHeadDropdownOpen] = useState(false);

  const filteredHeadUsers = useMemo(() => {
    const q = headSearch.trim().toLowerCase();
    return allUsers.filter((u) => {
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.position && u.position.toLowerCase().includes(q))
      );
    });
  }, [allUsers, headSearch]);

  // Current department members list (from allUsers matching memberIds)
  const currentMembers = useMemo(() => {
    return allUsers.filter((u) => memberIds.includes(u.id));
  }, [allUsers, memberIds]);

  const filteredCurrentMembers = useMemo(() => {
    const q = memberQuery.trim().toLowerCase();
    return currentMembers.filter((u) => {
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q)
      );
    });
  }, [currentMembers, memberQuery]);

  // Users available to add as new members (not currently in memberIds)
  const availableToAdd = useMemo(() => {
    const q = addMemberSearch.trim().toLowerCase();
    return allUsers.filter((u) => {
      if (memberIds.includes(u.id)) return false;
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.department && u.department.name.toLowerCase().includes(q))
      );
    });
  }, [allUsers, memberIds, addMemberSearch]);

  const handleAddMember = (userId: string) => {
    setMemberIds((prev) => [...prev, userId]);
    setIsAddMemberOpen(false);
    setAddMemberSearch('');
  };

  const handleRemoveMember = (userId: string) => {
    setMemberIds((prev) => prev.filter((id) => id !== userId));
  };

  const handleSave = async () => {
    if (!department) return;
    if (!name.trim()) {
      toast.error(isVi ? 'Tên phòng ban không được để trống' : 'Department name cannot be empty');
      return;
    }

    setIsSaving(true);
    try {
      await adminApi.updateDepartment(department.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        managerId: managerId || undefined,
        memberIds,
      });

      toast.success(
        isVi
          ? `Đã cập nhật thông tin phòng ban ${name.trim()}!`
          : `Department ${name.trim()} updated successfully!`,
      );
      onDepartmentUpdated();
      onClose();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        (isVi ? 'Không thể cập nhật phòng ban' : 'Failed to update department');
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!department) return;
    setIsDeleting(true);
    try {
      await adminApi.deleteDepartment(department.id);
      toast.success(
        isVi
          ? `Đã xóa phòng ban ${department.name} thành công!`
          : `Department ${department.name} deleted successfully!`,
      );
      onDepartmentUpdated();
      onClose();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        (isVi ? 'Không thể xóa phòng ban' : 'Failed to delete department');
      toast.error(msg);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (!isOpen || !department) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 md:p-6 overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSaving && !isDeleting) onClose();
      }}
    >
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-indigo-900/40">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-indigo-400/20 text-indigo-300 text-[10px] font-mono font-bold tracking-wider uppercase border border-indigo-400/30">
                  {department.code}
                </span>
                <h3 className="text-lg font-black tracking-tight text-white">
                  {department.name}
                </h3>
              </div>
              <p className="text-xs text-indigo-200/80 font-medium mt-0.5">
                {isVi ? 'Quản lý thông tin, phân công trưởng phòng và điều phối nhân sự' : 'Manage department attributes, head appointments, and members'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving || isDeleting}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab navigation */}
        <div className="px-6 pt-3 border-b border-slate-200 bg-slate-50/70 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 border-b-2 ${
              activeTab === 'info'
                ? 'border-indigo-600 text-indigo-700 bg-white shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>{isVi ? 'Thông tin chung & Sửa' : 'Overview & Edit'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('members')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 border-b-2 ${
              activeTab === 'members'
                ? 'border-indigo-600 text-indigo-700 bg-white shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>
              {isVi ? 'Thành viên' : 'Members'} ({memberIds.length})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('projects')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 border-b-2 ${
              activeTab === 'projects'
                ? 'border-indigo-600 text-indigo-700 bg-white shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FolderKanban className="w-3.5 h-3.5" />
            <span>
              {isVi ? 'Dự án liên quan' : 'Projects'} ({department.projects?.length || 0})
            </span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* TAB 1: OVERVIEW & EDIT */}
          {activeTab === 'info' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800">
                    {isVi ? 'Tên phòng ban' : 'Department Name'}{' '}
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full h-10 px-3.5 text-xs font-medium rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600 bg-slate-50/50 hover:bg-white transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800">
                    {isVi ? 'Mã phòng ban' : 'Code'}
                  </label>
                  <input
                    type="text"
                    disabled
                    value={department.code}
                    className="w-full h-10 px-3.5 text-xs font-mono font-bold uppercase rounded-xl border border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  {isVi ? 'Mô tả phạm vi chức năng' : 'Department Scope & Mission'}
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={
                    isVi ? 'Nhập mô tả chức năng nhiệm vụ...' : 'Enter scope and responsibilities...'
                  }
                  className="w-full p-3 text-xs font-medium rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600 resize-none bg-slate-50/50 hover:bg-white transition-all"
                />
              </div>

              {/* Department Head Assignment */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>{isVi ? 'Trưởng phòng (Department Head)' : 'Department Head'}</span>
                  {selectedManager && (
                    <span className="text-xs text-indigo-600 font-semibold">
                      {isVi ? 'Đang bổ nhiệm' : 'Appointed'}
                    </span>
                  )}
                </label>

                {selectedManager ? (
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-indigo-50/80 border border-indigo-200">
                    <div className="flex items-center gap-3">
                      {selectedManager.avatar ? (
                        <img
                          src={selectedManager.avatar}
                          alt={selectedManager.name}
                          className="w-10 h-10 rounded-xl object-cover border border-indigo-200"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                          {selectedManager.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{selectedManager.name}</span>
                          <span className="px-1.5 py-0.5 rounded-md bg-indigo-600 text-white text-[9px] font-bold">
                            HEAD
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500">{selectedManager.email}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setManagerId('')}
                      className="px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-xl font-bold transition-colors"
                    >
                      {isVi ? 'Gỡ bổ nhiệm' : 'Unassign Head'}
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder={
                          isVi
                            ? 'Tìm kiếm nhân sự để bổ nhiệm trưởng phòng...'
                            : 'Search employee to appoint as Head...'
                        }
                        value={headSearch}
                        onFocus={() => setIsHeadDropdownOpen(true)}
                        onChange={(e) => {
                          setHeadSearch(e.target.value);
                          setIsHeadDropdownOpen(true);
                        }}
                        className="w-full h-10 pl-9 pr-4 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600 bg-white"
                      />
                    </div>

                    {isHeadDropdownOpen && (
                      <div className="absolute left-0 right-0 top-full mt-1.5 z-20 max-h-52 overflow-y-auto bg-white rounded-2xl border border-slate-200 shadow-xl p-1.5 space-y-1">
                        {filteredHeadUsers.length === 0 ? (
                          <div className="py-4 text-center text-xs text-slate-400 font-medium">
                            {isVi ? 'Không tìm thấy nhân sự phù hợp' : 'No matching staff'}
                          </div>
                        ) : (
                          filteredHeadUsers.map((u) => (
                            <div
                              key={u.id}
                              onClick={() => {
                                setManagerId(u.id);
                                setIsHeadDropdownOpen(false);
                                setHeadSearch('');
                                if (!memberIds.includes(u.id)) {
                                  setMemberIds((prev) => [...prev, u.id]);
                                }
                              }}
                              className="flex items-center justify-between p-2 rounded-xl hover:bg-indigo-50/70 cursor-pointer transition-colors"
                            >
                              <div className="flex items-center gap-2.5">
                                {u.avatar ? (
                                  <img
                                    src={u.avatar}
                                    alt={u.name}
                                    className="w-7 h-7 rounded-lg object-cover"
                                  />
                                ) : (
                                  <div className="w-7 h-7 rounded-lg bg-slate-200 text-slate-700 font-bold text-[10px] flex items-center justify-center">
                                    {u.name.charAt(0)}
                                  </div>
                                )}
                                <div>
                                  <div className="text-xs font-bold text-slate-900">{u.name}</div>
                                  <div className="text-[10px] text-slate-400">{u.email}</div>
                                </div>
                              </div>
                              <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold">
                                {u.role}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Danger Zone */}
              <div className="pt-6 border-t border-slate-200/80">
                <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span>{isVi ? 'Xóa phòng ban này' : 'Delete Department'}</span>
                    </h4>
                    <p className="text-[11px] text-rose-700/90 mt-1 max-w-md font-medium">
                      {isVi
                        ? 'Khi xóa, toàn bộ thành viên và dự án liên quan sẽ được tự động gỡ liên kết an toàn (không bị mất dữ liệu).'
                        : 'All associated members and projects will be safely unlinked without data loss.'}
                    </p>
                  </div>

                  {showDeleteConfirm ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(false)}
                        className="px-3 h-8 text-xs font-bold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700"
                      >
                        {isVi ? 'Hủy' : 'Cancel'}
                      </button>
                      <button
                        type="button"
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="px-3 h-8 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {isDeleting && <Loader2 className="w-3 h-3 animate-spin" />}
                        <span>{isVi ? 'Xác nhận xóa' : 'Confirm'}</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="px-3.5 h-8.5 rounded-xl border border-rose-300 bg-white hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors shrink-0 flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      <span>{isVi ? 'Xóa phòng ban' : 'Delete'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MEMBERS MANAGEMENT */}
          {activeTab === 'members' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Search members in department */}
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder={
                      isVi
                        ? 'Tìm kiếm thành viên trong phòng ban...'
                        : 'Search members in department...'
                    }
                    value={memberQuery}
                    onChange={(e) => setMemberQuery(e.target.value)}
                    className="w-full h-9 pl-9 pr-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-slate-50/60"
                  />
                </div>

                {/* Add member button and searchable combobox */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsAddMemberOpen((prev) => !prev)}
                    className="h-9 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>{isVi ? 'Thêm nhân sự vào phòng' : 'Add Member'}</span>
                  </button>

                  {isAddMemberOpen && (
                    <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl border border-slate-200 shadow-2xl p-2 z-30 animate-in fade-in zoom-in-95 duration-150">
                      <div className="p-1 mb-2">
                        <input
                          type="text"
                          placeholder={
                            isVi
                              ? 'Tìm nhân sự công ty theo tên, email...'
                              : 'Search company staff...'
                          }
                          value={addMemberSearch}
                          onChange={(e) => setAddMemberSearch(e.target.value)}
                          className="w-full h-8 px-2.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                          autoFocus
                        />
                      </div>

                      <div className="max-h-48 overflow-y-auto space-y-1">
                        {availableToAdd.length === 0 ? (
                          <div className="py-4 text-center text-xs text-slate-400">
                            {isVi ? 'Không có nhân viên phù hợp' : 'No staff available'}
                          </div>
                        ) : (
                          availableToAdd.map((u) => (
                            <div
                              key={u.id}
                              onClick={() => handleAddMember(u.id)}
                              className="flex items-center justify-between p-2 rounded-lg hover:bg-indigo-50 cursor-pointer transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-md bg-indigo-100 text-indigo-700 text-[10px] font-bold flex items-center justify-center">
                                  {u.name.charAt(0)}
                                </div>
                                <div>
                                  <div className="text-xs font-bold text-slate-800">{u.name}</div>
                                  <div className="text-[10px] text-slate-400">{u.email}</div>
                                </div>
                              </div>
                              <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                                + Thêm
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Members List */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                {filteredCurrentMembers.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs font-medium">
                    {isVi
                      ? 'Chưa có thành viên nào trong phòng ban này'
                      : 'No members in this department yet'}
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {filteredCurrentMembers.map((u) => {
                      const isHead = u.id === managerId;
                      return (
                        <div
                          key={u.id}
                          className="p-3.5 flex items-center justify-between hover:bg-slate-50/70 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            {u.avatar ? (
                              <img
                                src={u.avatar}
                                alt={u.name}
                                className="w-9 h-9 rounded-xl object-cover"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-xl bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center">
                                {u.name.charAt(0)}
                              </div>
                            )}
                            <div>
                              <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                                <span>{u.name}</span>
                                {isHead && (
                                  <span className="px-1.5 py-0.5 rounded-md bg-indigo-600 text-white text-[9px] font-bold">
                                    HEAD
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500">{u.email}</div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold">
                              {u.role}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveMember(u.id)}
                              className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors"
                              title={isVi ? 'Gỡ thành viên khỏi phòng' : 'Remove from department'}
                            >
                              <UserMinus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: PROJECTS OVERVIEW */}
          {activeTab === 'projects' && (
            <div className="space-y-4">
              {(!department.projects || department.projects.length === 0) ? (
                <div className="py-12 text-center text-slate-400 text-xs font-medium">
                  {isVi
                    ? 'Chưa có dự án nào được gán trực thuộc phòng ban này'
                    : 'No projects allocated to this department yet'}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {department.projects.map((proj) => (
                    <div
                      key={proj.id}
                      className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-indigo-300 transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-mono font-bold">
                            {proj.code || proj.id.slice(0, 6)}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              proj.status === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {proj.status}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900">{proj.name}</h4>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                        <span>Workflow: {proj.workflowType || 'KANBAN'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500 font-medium">
            {isVi
              ? `ID phòng: ${department.id}`
              : `Dept ID: ${department.id}`}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving || isDeleting}
              className="px-4 h-10 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              {isVi ? 'Đóng' : 'Close'}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || isDeleting}
              className="px-5 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md hover:shadow-indigo-500/25 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{isSaving ? (isVi ? 'Đang lưu...' : 'Saving...') : (isVi ? 'Lưu thay đổi' : 'Save Changes')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
