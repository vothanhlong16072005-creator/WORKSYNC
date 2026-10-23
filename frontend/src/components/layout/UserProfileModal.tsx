import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Mail,
  Shield,
  Briefcase,
  Globe,
  Camera,
  Check,
  Lock,
  Loader2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/auth.store';
import { apiClient } from '@/lib/api-client';
import { changeLanguage } from '@/i18n/i18n';
import { toast } from 'sonner';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_AVATARS = [
  {
    label: 'Nam Kỹ sư 1',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=faces',
  },
  {
    label: 'Nữ Quản lý 1',
    url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop&crop=faces',
  },
  {
    label: 'Nam Lãnh đạo 2',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=faces',
  },
  {
    label: 'Nữ Chuyên viên 2',
    url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop&crop=faces',
  },
  {
    label: 'Nữ Trẻ tuổi',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=faces',
  },
  {
    label: 'Nam Trẻ tuổi',
    url: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=200&h=200&fit=crop&crop=faces',
  },
];

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, updateUser } = useAuthStore();
  const { i18n } = useTranslation();
  const isEn = i18n.language.startsWith('en');

  const [name, setName] = useState(user?.name || '');
  const [position, setPosition] = useState(user?.position || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [language, setLanguage] = useState(user?.language || 'VI');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (user && isOpen) {
      setName(user.name || '');
      setPosition(user.position || '');
      setAvatar(user.avatar || '');
      setLanguage(user.language || 'VI');
      setErrorMsg(null);
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg(isEn ? 'Full name cannot be blank' : 'Họ và tên không được để trống');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await apiClient.patch('/users/profile', {
        name: name.trim(),
        position: position.trim() || null,
        avatar: avatar.trim() || null,
        language,
      });

      updateUser({
        name: res.data.name,
        position: res.data.position,
        avatar: res.data.avatar,
        language: res.data.language,
      });

      if (language) {
        changeLanguage(language.toLowerCase() as 'vi' | 'en');
      }

      toast.success(isEn ? 'Profile updated successfully!' : 'Cập nhật thông tin cá nhân thành công!');
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : isEn ? 'Failed to update profile' : 'Lỗi khi cập nhật hồ sơ';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isEn ? 'Personal Profile & Settings' : 'Thông Tin Cá Nhân & Hồ Sơ'}
              </h3>
              <p className="text-xs text-slate-500">
                {isEn ? 'Update your display avatar, title, and preferences' : 'Tùy chỉnh ảnh đại diện, chức danh và thông tin hiển thị'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          {/* Section 1: Read-Only Enterprise Credentials */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-slate-400" />
                {isEn ? 'Protected Corporate Credentials (Read-only)' : 'Thông Tin Định Danh Công Vụ (Không thể sửa)'}
              </span>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-200/80 px-2 py-0.5 rounded-md">
                Admin Locked
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] text-slate-400 block">Email công vụ</span>
                  <span className="font-bold text-slate-800 truncate block">{user.email}</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center gap-2.5">
                <Shield className="w-4 h-4 text-blue-600 shrink-0" />
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] text-slate-400 block">Vai trò hệ thống</span>
                  <span className="font-black text-blue-700 uppercase">{user.role}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Avatar Selection & Custom URL */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-blue-600" />
              <span>{isEn ? 'Avatar Picture' : 'Ảnh Đại Diện'}</span>
            </label>

            <div className="flex items-center gap-4">
              {avatar ? (
                <img
                  src={avatar}
                  alt={name}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-blue-500 shadow-md shrink-0"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-700 border-2 border-slate-200 flex items-center justify-center font-black text-xl shrink-0">
                  {name.charAt(0).toUpperCase()}
                </div>
              )}

              <div className="flex-1 min-w-0 space-y-1.5">
                <input
                  type="url"
                  placeholder={isEn ? 'Paste image URL (https://...)' : 'Dán đường dẫn ảnh URL (https://...)'}
                  value={avatar}
                  onChange={(e) => setAvatar(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-blue-500 text-slate-800 font-medium"
                />
                <p className="text-[10px] text-slate-400">
                  {isEn ? 'Or choose from high-resolution corporate presets below:' : 'Hoặc chọn nhanh từ bộ ảnh đại diện doanh nghiệp có sẵn:'}
                </p>
              </div>
            </div>

            {/* Avatar Presets Grid */}
            <div className="grid grid-cols-6 gap-2 pt-1">
              {PRESET_AVATARS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setAvatar(p.url)}
                  title={p.label}
                  className={`relative rounded-xl overflow-hidden aspect-square border-2 transition-all cursor-pointer group ${
                    avatar === p.url ? 'border-blue-600 ring-2 ring-blue-500/30 scale-105' : 'border-slate-200 hover:border-slate-400'
                  }`}
                >
                  <img src={p.url} alt={p.label} className="w-full h-full object-cover" />
                  {avatar === p.url && (
                    <div className="absolute inset-0 bg-blue-600/40 flex items-center justify-center text-white">
                      <Check className="w-4 h-4 stroke-[3]" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Section 3: Editable Personal Info */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                {isEn ? 'Full Name *' : 'Họ và Tên *'}
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-blue-500 font-semibold text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                <span>{isEn ? 'Position / Job Title' : 'Chức Danh / Vị Trí Công Tác'}</span>
              </label>
              <input
                type="text"
                placeholder={isEn ? 'e.g. Senior Software Engineer' : 'Ví dụ: Trưởng phòng Kỹ thuật, Senior PM, Lead Developer...'}
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-blue-500 font-medium text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-blue-600" />
                <span>{isEn ? 'Interface Language Preference' : 'Ngôn Ngữ Giao Diện Mặc Định'}</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setLanguage('VI')}
                  className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                    language === 'VI'
                      ? 'border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-600'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>🇻🇳 Tiếng Việt (VI)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setLanguage('EN')}
                  className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                    language === 'EN'
                      ? 'border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-600'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>🇬🇧 English (EN)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-bold rounded-xl text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              {isEn ? 'Cancel' : 'Hủy Bỏ'}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-all"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{isEn ? 'Saving Changes...' : 'Đang Lưu Thay Đổi...'}</span>
                </>
              ) : (
                <span>{isEn ? 'Save Profile' : 'Lưu Hồ Sơ'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
