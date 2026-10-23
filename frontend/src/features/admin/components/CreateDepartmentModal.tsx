import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Building2,
  X,
  Search,
  Check,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { adminApi } from '../api/admin.api';
import type { AdminUserItem } from '../types/admin.types';

interface CreateDepartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  users: AdminUserItem[];
}

export const CreateDepartmentModal: React.FC<CreateDepartmentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  users,
}) => {
  const { i18n } = useTranslation();
  const isVi = i18n.language.startsWith('vi');

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [managerId, setManagerId] = useState('');
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Search queries
  const [headSearch, setHeadSearch] = useState('');
  const [isHeadDropdownOpen, setIsHeadDropdownOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');

  // Selected manager object
  const selectedManager = useMemo(
    () => users.find((u) => u.id === managerId),
    [users, managerId],
  );

  // Filtered users for manager selection
  const filteredHeadUsers = useMemo(() => {
    const q = headSearch.trim().toLowerCase();
    return users.filter((u) => {
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.position && u.position.toLowerCase().includes(q))
      );
    });
  }, [users, headSearch]);

  // Filtered users for member assignment (excluding the appointed manager)
  const availableMembers = useMemo(() => {
    return users.filter((u) => u.id !== managerId);
  }, [users, managerId]);

  const filteredMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    return availableMembers.filter((u) => {
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.department && u.department.name.toLowerCase().includes(q))
      );
    });
  }, [availableMembers, memberSearch]);

  const handleToggleMember = (userId: string) => {
    setMemberIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  };

  const handleSelectAllFiltered = () => {
    const newIds = new Set(memberIds);
    filteredMembers.forEach((u) => newIds.add(u.id));
    setMemberIds(Array.from(newIds));
  };

  const handleDeselectAllFiltered = () => {
    const filteredSet = new Set(filteredMembers.map((u) => u.id));
    setMemberIds((prev) => prev.filter((id) => !filteredSet.has(id)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      toast.error(
        isVi
          ? 'Vui lòng nhập tên và mã phòng ban'
          : 'Department name and code are required',
      );
      return;
    }

    setSubmitting(true);
    try {
      await adminApi.createDepartment({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: description.trim() || undefined,
        managerId: managerId || undefined,
        memberIds: memberIds.length > 0 ? memberIds : undefined,
      });

      toast.success(
        isVi
          ? `Phòng ban "${name.trim()}" đã được khởi tạo thành công!`
          : `Department "${name.trim()}" created successfully!`,
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        (isVi ? 'Không thể tạo phòng ban mới' : 'Failed to create department');
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 md:p-6 overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-indigo-900/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight text-white">
                {isVi ? 'Tạo Phòng Ban Doanh Nghiệp Mới' : 'Create New Enterprise Department'}
              </h3>
              <p className="text-xs text-indigo-200/80 font-medium">
                {isVi
                  ? 'Thiết lập khối chuyên môn, phân bổ trưởng phòng và nhân sự trực thuộc'
                  : 'Define organizational unit, appoint head and allocate team members'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Row 1: Name and Code */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-1.5">
              <label className="block text-xs font-bold text-slate-800">
                {isVi ? 'Tên phòng ban' : 'Department Name'}{' '}
                <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder={
                  isVi
                    ? 'VD: Kỹ thuật Phần mềm (Software Engineering)'
                    : 'e.g. AI & Cloud Engineering'
                }
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-10 px-3.5 text-xs font-medium rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600 transition-all bg-slate-50/50 hover:bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800">
                {isVi ? 'Mã phòng ban (Code)' : 'Code'}{' '}
                <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="VD: TECH_AI"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s+/g, '_'))}
                className="w-full h-10 px-3.5 text-xs font-mono font-bold uppercase rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600 transition-all bg-slate-50/50 hover:bg-white"
              />
            </div>
          </div>

          {/* Row 2: Description */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-800">
              {isVi ? 'Mô tả phạm vi chức năng' : 'Department Scope & Mission'}
            </label>
            <textarea
              rows={2}
              placeholder={
                isVi
                  ? 'Mô tả sứ mệnh, định hướng dự án và phạm vi chuyên môn...'
                  : 'Outline department responsibilities, scope, and objectives...'
              }
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 text-xs font-medium rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600 resize-none transition-all bg-slate-50/50 hover:bg-white"
            />
          </div>

          {/* Row 3: Searchable Department Head Combobox */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>{isVi ? 'Bổ nhiệm Trưởng phòng (Department Head)' : 'Appoint Department Head'}</span>
              <span className="text-[11px] font-normal text-slate-400">
                {isVi ? 'Tùy chọn bổ nhiệm ngay hoặc gán sau' : 'Optional, can be assigned later'}
              </span>
            </label>

            {/* Selected Head display or trigger */}
            {selectedManager ? (
              <div className="flex items-center justify-between p-3 rounded-2xl bg-indigo-50/80 border border-indigo-200">
                <div className="flex items-center gap-3">
                  {selectedManager.avatar ? (
                    <img
                      src={selectedManager.avatar}
                      alt={selectedManager.name}
                      className="w-9 h-9 rounded-xl object-cover border border-indigo-200"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
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
                  onClick={() => {
                    setManagerId('');
                    setIsHeadDropdownOpen(false);
                  }}
                  className="px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50 rounded-lg font-semibold transition-colors"
                >
                  {isVi ? 'Gỡ bổ nhiệm' : 'Unassign'}
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
                        ? 'Tìm kiếm nhân sự để bổ nhiệm trưởng phòng (tên, email)...'
                        : 'Search employee to appoint as Head (name, email)...'
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
                        {isVi ? 'Không tìm thấy nhân viên phù hợp' : 'No matching staff found'}
                      </div>
                    ) : (
                      filteredHeadUsers.map((u) => (
                        <div
                          key={u.id}
                          onClick={() => {
                            setManagerId(u.id);
                            setIsHeadDropdownOpen(false);
                            setHeadSearch('');
                            // If user was in members, keep or remove
                            setMemberIds((prev) => prev.filter((id) => id !== u.id));
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
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold">
                              {u.role}
                            </span>
                            {u.department && (
                              <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold">
                                {u.department.name}
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Row 4: Searchable Initial Members Assignment */}
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="block text-xs font-bold text-slate-800">
                {isVi ? 'Gán nhân viên ban đầu vào phòng ban' : 'Assign Initial Team Members'}
                {memberIds.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[11px] font-bold">
                    {memberIds.length} {isVi ? 'đã chọn' : 'selected'}
                  </span>
                )}
              </label>

              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={handleSelectAllFiltered}
                  className="text-indigo-600 hover:text-indigo-800 font-bold hover:underline"
                >
                  {isVi ? 'Chọn tất cả lọc' : 'Select all'}
                </button>
                <span className="text-slate-300">•</span>
                <button
                  type="button"
                  onClick={handleDeselectAllFiltered}
                  className="text-slate-500 hover:text-slate-700 font-bold hover:underline"
                >
                  {isVi ? 'Bỏ chọn' : 'Deselect'}
                </button>
              </div>
            </div>

            {/* Filter Search Input for Members */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={
                  isVi
                    ? 'Lọc danh sách nhân viên theo tên, email, vị trí...'
                    : 'Filter staff list by name, email, role...'
                }
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                className="w-full h-8 pl-8 pr-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-slate-50/60"
              />
            </div>

            {/* Scrollable list with Bauhaus checkboxes */}
            <div className="border border-slate-200/90 rounded-2xl p-2 max-h-56 overflow-y-auto space-y-1 bg-slate-50/40">
              {filteredMembers.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400 font-medium">
                  {isVi ? 'Không có nhân viên phù hợp bộ lọc' : 'No staff matched filter'}
                </div>
              ) : (
                filteredMembers.map((u) => {
                  const isChecked = memberIds.includes(u.id);
                  return (
                    <div
                      key={u.id}
                      onClick={() => handleToggleMember(u.id)}
                      className={`flex items-center justify-between p-2 rounded-xl cursor-pointer select-none transition-all ${
                        isChecked
                          ? 'bg-indigo-50/90 border border-indigo-200 shadow-xs'
                          : 'hover:bg-white border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${
                            isChecked
                              ? 'bg-indigo-600 border-indigo-600 text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>

                        {u.avatar ? (
                          <img
                            src={u.avatar}
                            alt={u.name}
                            className="w-6 h-6 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-lg bg-slate-200 text-slate-600 font-bold text-[10px] flex items-center justify-center">
                            {u.name.charAt(0)}
                          </div>
                        )}

                        <div>
                          <span className="text-xs font-bold text-slate-900">{u.name}</span>
                          <span className="ml-1.5 text-[11px] text-slate-400">({u.email})</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold">
                          {u.role}
                        </span>
                        {u.department && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-200/70 text-slate-700 font-medium">
                            {u.department.name}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 h-10 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              {isVi ? 'Hủy' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md hover:shadow-indigo-500/25 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>
                {submitting
                  ? isVi
                    ? 'Đang khởi tạo...'
                    : 'Creating...'
                  : isVi
                  ? 'Khởi tạo phòng ban'
                  : 'Create Department'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
