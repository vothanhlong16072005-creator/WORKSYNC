import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Copy,
  Check,
  Zap,
  FolderKanban,
  Calendar,
  ShieldCheck,
  MapPin,
  Laptop,
  Loader2,
  MessageSquare,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth.store';
import { useChatStore } from '@/features/chat/stores/chat.store';
import { ModalShell } from './ModalShell';
import { deptHeadApi } from '../../api/dept-head.api';
import type { DeptHeadMemberProfile } from '../../types/dashboard.types';

interface DeptHeadMemberProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberId: string | null;
  onAssignTask?: (memberId: string) => void;
}

export function DeptHeadMemberProfileModal({
  isOpen,
  onClose,
  memberId,
  onAssignTask,
}: DeptHeadMemberProfileModalProps) {
  const [data, setData] = useState<DeptHeadMemberProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isStartingChat, setIsStartingChat] = useState(false);

  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);
  const startDirectChat = useChatStore((s) => s.startDirectChat);

  const handleStartChat = async (targetId: string) => {
    setIsStartingChat(true);
    try {
      const convId = await startDirectChat(targetId);
      onClose();
      navigate(`/chat/${convId}`);
    } catch {
      toast.error('Không thể mở cuộc trò chuyện');
    } finally {
      setIsStartingChat(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !memberId) {
      setData(null);
      return;
    }
    void loadProfile(memberId);
  }, [isOpen, memberId]);

  const loadProfile = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await deptHeadApi.getMemberProfile(id);
      setData(res);
    } catch (err: unknown) {
      setError('Không thể tải thông tin nhân viên');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyEmail = () => {
    if (!data?.email) return;
    navigator.clipboard.writeText(data.email);
    setCopied(true);
    toast.success('Đã sao chép email');
    setTimeout(() => setCopied(false), 2000);
  };

  const getAttendanceStatusBadge = (status: 'OFFICE' | 'WFH' | 'LEAVE' | 'OFF' | 'PENDING') => {
    switch (status) {
      case 'OFFICE':
        return (
          <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-black text-[9px] uppercase tracking-wider flex items-center gap-1">
            <MapPin className="w-2.5 h-2.5" />
            Văn phòng
          </span>
        );
      case 'WFH':
        return (
          <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 font-black text-[9px] uppercase tracking-wider flex items-center gap-1">
            <Laptop className="w-2.5 h-2.5" />
            WFH
          </span>
        );
      case 'LEAVE':
        return (
          <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-black text-[9px] uppercase tracking-wider flex items-center gap-1">
            <Calendar className="w-2.5 h-2.5" />
            Nghỉ phép
          </span>
        );
      case 'OFF':
        return (
          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 font-bold text-[9px] uppercase tracking-wider">
            Nghỉ tuần
          </span>
        );
      case 'PENDING':
      default:
        return (
          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-bold text-[9px] uppercase tracking-wider">
            Chưa vào
          </span>
        );
    }
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={data?.name || 'Hồ Sơ Nhân Sự'}
      subtitle={data ? `${data.position || 'Nhân viên'} • ${data.department?.name || 'Phòng ban'}` : 'Đang tải...'}
      size="lg"
      headerGradient="indigo"
      footer={
        data && (
          <div className="flex items-center justify-between w-full">
            <button
              type="button"
              onClick={handleCopyEmail}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Đã sao chép' : 'Sao chép Email'}</span>
            </button>

            <div className="flex items-center gap-2">
              {currentUser?.id !== data.id && (
                <button
                  type="button"
                  onClick={() => handleStartChat(data.id)}
                  disabled={isStartingChat}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>{isStartingChat ? 'Đang mở...' : 'Nhắn tin'}</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/70 transition-colors cursor-pointer"
              >
                Đóng
              </button>
              {onAssignTask && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onAssignTask(data.id);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition-colors shadow-xs cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Giao việc ngay</span>
                </button>
              )}
            </div>
          </div>
        )
      }
    >
      {loading && (
        <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
          <Loader2 className="w-7 h-7 animate-spin text-indigo-600" />
          <span className="text-xs font-semibold">Đang tải hồ sơ nhân viên...</span>
        </div>
      )}

      {error && (
        <div className="py-12 text-center text-rose-600 text-xs font-semibold">
          {error}
        </div>
      )}

      {data && !loading && (
        <div className="space-y-4 text-xs">
          {/* Profile header card */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/60 to-slate-50 border border-indigo-100 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              {data.avatar ? (
                <img
                  src={data.avatar}
                  alt={data.name}
                  className="w-12 h-12 rounded-2xl object-cover border-2 border-white shadow-xs shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white font-black text-lg flex items-center justify-center shrink-0 shadow-xs">
                  {data.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <h3 className="text-sm font-black text-slate-900 truncate">{data.name}</h3>
                <p className="text-slate-500 text-[11px] truncate">{data.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 text-[10px] font-bold">
                    {data.role}
                  </span>
                  {data.position && (
                    <span className="text-[10px] text-slate-500 font-semibold">{data.position}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Quick stats ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
            <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-100">
              <div className="text-[10px] text-blue-700 uppercase font-black">Tasks Đang Mở</div>
              <div className="text-xl font-black text-blue-900 mt-0.5">{data.stats.openTasks}</div>
            </div>
            <div
              className={`p-3 rounded-2xl border ${
                data.stats.overdueTasks > 0
                  ? 'bg-rose-50 border-rose-200'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div
                className={`text-[10px] uppercase font-black ${
                  data.stats.overdueTasks > 0 ? 'text-rose-700' : 'text-slate-500'
                }`}
              >
                Quá Hạn
              </div>
              <div
                className={`text-xl font-black mt-0.5 ${
                  data.stats.overdueTasks > 0 ? 'text-rose-800' : 'text-slate-800'
                }`}
              >
                {data.stats.overdueTasks}
              </div>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-100">
              <div className="text-[10px] text-emerald-700 uppercase font-black">Xong Tuần Này</div>
              <div className="text-xl font-black text-emerald-900 mt-0.5">
                {data.stats.doneThisWeek}
              </div>
            </div>
            <div className="p-3 rounded-2xl bg-purple-50/70 border border-purple-100">
              <div className="text-[10px] text-purple-700 uppercase font-black">Xong Tháng Này</div>
              <div className="text-xl font-black text-purple-900 mt-0.5">
                {data.stats.doneThisMonth}
              </div>
            </div>
          </div>

          {/* 7-day Attendance Mini Strip */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-teal-600" />
                <h4 className="font-black text-slate-900">Lịch Sử Hiện Diện (7 Ngày Gần Nhất)</h4>
              </div>
              <span className="text-[10px] text-slate-400">GPS & WFH</span>
            </div>

            <div className="grid grid-cols-7 gap-1.5 text-center">
              {data.attendanceHistory.map((day) => (
                <div
                  key={day.date}
                  className="p-2 rounded-xl bg-slate-50/80 border border-slate-200/60 flex flex-col items-center justify-between min-h-[64px]"
                >
                  <span className="text-[10px] font-black text-slate-700">{day.dayName}</span>
                  <div className="my-1">{getAttendanceStatusBadge(day.status)}</div>
                  <span className="text-[9px] text-slate-400 truncate">
                    {day.checkInTime
                      ? new Date(day.checkInTime).toLocaleTimeString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Tasks: Quick Tasks & Project Tasks */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Quick Tasks */}
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 space-y-2">
              <div className="flex items-center gap-1.5 text-amber-700 font-black pb-1.5 border-b border-slate-100">
                <Zap className="w-3.5 h-3.5" />
                <h4>Quick Tasks Gần Đây ({data.recentQuickTasks.length})</h4>
              </div>

              {data.recentQuickTasks.length === 0 ? (
                <div className="py-4 text-center text-slate-400 text-xs italic">
                  Không có Quick Task nào
                </div>
              ) : (
                <div className="space-y-1.5">
                  {data.recentQuickTasks.map((t) => (
                    <div
                      key={t.id}
                      className="p-2 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between gap-2"
                    >
                      <span className="font-bold text-slate-900 truncate">{t.title}</span>
                      <span
                        className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md shrink-0 ${
                          t.status === 'DONE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {t.status === 'DONE' ? 'Xong' : 'Đang làm'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Project Tasks */}
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 space-y-2">
              <div className="flex items-center gap-1.5 text-blue-700 font-black pb-1.5 border-b border-slate-100">
                <FolderKanban className="w-3.5 h-3.5" />
                <h4>Task Dự Án Gần Đây ({data.recentProjectTasks.length})</h4>
              </div>

              {data.recentProjectTasks.length === 0 ? (
                <div className="py-4 text-center text-slate-400 text-xs italic">
                  Không có Task dự án nào
                </div>
              ) : (
                <div className="space-y-1.5">
                  {data.recentProjectTasks.map((t) => (
                    <div
                      key={t.id}
                      className="p-2 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate">{t.title}</div>
                        <div className="text-[10px] text-slate-500 truncate">{t.projectName}</div>
                      </div>
                      <span
                        className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md shrink-0 ${
                          t.status === 'DONE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {t.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </ModalShell>
  );
}
