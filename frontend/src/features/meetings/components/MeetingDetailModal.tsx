import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Bot,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  ListTodo,
  Loader2,
  MessageSquare,
  Plus,
  Sparkles,
  User,
  Users,
  Video,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth.store';
import { AiFormattedContent } from '@/components/ui/AiFormattedContent';
import { meetingApi } from '../api/meeting.api';
import type {
  ActionItem,
  Meeting,
  MeetingSummaryResult,
  MeetingTranscriptChunk,
} from '../types/meeting.types';
import { MeetingScopeBadge } from './MeetingScopeBadge';

interface MeetingDetailModalProps {
  meeting: Meeting | null;
  isOpen: boolean;
  onClose: () => void;
}

export const MeetingDetailModal: React.FC<MeetingDetailModalProps> = ({
  meeting,
  isOpen,
  onClose,
}) => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'ai' | 'attendees' | 'transcript'>('ai');
  const [aiSummary, setAiSummary] = useState<MeetingSummaryResult | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [exportingDoc, setExportingDoc] = useState(false);

  // Transcripts list
  const [transcripts, setTranscripts] = useState<MeetingTranscriptChunk[]>([]);
  const [loadingTranscripts, setLoadingTranscripts] = useState(false);

  // 1-click Task map
  const [createdTasksMap, setCreatedTasksMap] = useState<Record<number, boolean>>({});
  const [creatingTaskIndex, setCreatingTaskIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen || !meeting) return;

    setLoadingSummary(true);
    meetingApi
      .getAiSummary(meeting.id)
      .then((res) => {
        if (res.hasSummary) {
          setAiSummary(res);
        } else {
          setAiSummary(null);
        }
      })
      .catch(() => setAiSummary(null))
      .finally(() => setLoadingSummary(false));

    setLoadingTranscripts(true);
    meetingApi
      .getTranscripts(meeting.id)
      .then((data) => setTranscripts(data))
      .catch(() => setTranscripts([]))
      .finally(() => setLoadingTranscripts(false));
  }, [isOpen, meeting]);

  if (!isOpen || !meeting) return null;

  const currentAttendee = meeting.attendees.find((a) => a.userId === user?.id);
  const isCreator = user?.id === meeting.createdById;
  const canManage = isCreator || user?.role === 'ADMIN' || user?.role === 'PM';

  const start = new Date(meeting.startTime);
  const end = new Date(meeting.endTime);
  const isOngoing =
    meeting.status === 'IN_PROGRESS' ||
    (meeting.status === 'SCHEDULED' && new Date() >= start && new Date() <= end);

  // User attendance status badge
  const getUserAttendanceBadge = () => {
    if (isCreator) {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-600 border border-purple-500/20">
          Người tổ chức (Host)
        </span>
      );
    }
    if (currentAttendee?.joinedAt) {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
          Đã tham gia ({Math.round(currentAttendee.totalDurationSeconds / 60)} phút)
        </span>
      );
    }
    if (currentAttendee?.rsvp === 'ACCEPTED') {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 border border-blue-500/20">
          Đã đồng ý tham gia
        </span>
      );
    }
    if (currentAttendee?.rsvp === 'DECLINED') {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 border border-rose-500/20">
          Đã từ chối
        </span>
      );
    }
    if (currentAttendee) {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20">
          Chờ phản hồi
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-500 border border-slate-500/20">
        Không có trong danh sách
      </span>
    );
  };

  // Generate AI summary
  const handleGenerateAi = async () => {
    setGenerating(true);
    try {
      toast.info('Trợ lý AI đang phân tích kịch bản cuộc họp...');
      const res = await meetingApi.generateAiSummary(meeting.id, { language: 'VI' });
      setAiSummary(res);
      toast.success('Đã tạo thành công biên bản AI!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Lỗi khi tạo biên bản AI');
    } finally {
      setGenerating(false);
    }
  };

  // Export to document
  const handleExportDoc = async () => {
    setExportingDoc(true);
    try {
      const res = await meetingApi.exportToDocument(meeting.id);
      toast.success(`Đã xuất biên bản sang Document: "${res.title}"`, {
        action: {
          label: 'Mở xem',
          onClick: () => navigate(`/documents/${res.id}`),
        },
      });
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Lỗi khi xuất sang Document');
    } finally {
      setExportingDoc(false);
    }
  };

  // 1-Click Create Task
  const handleCreateTask = async (item: ActionItem, index: number) => {
    if (!meeting.projectId) {
      toast.error('Cuộc họp không thuộc dự án cụ thể để tạo Task!');
      return;
    }
    setCreatingTaskIndex(index);
    try {
      await apiClient.post('/tasks', {
        title: item.task,
        description: `Tạo từ Biên bản AI cuộc họp: "${meeting.title}". Người làm: ${item.assignee || 'N/A'}`,
        projectId: meeting.projectId,
        assigneeId: item.assigneeId || undefined,
        priority: item.priority || 'MEDIUM',
        dueDate: item.deadline ? new Date(item.deadline).toISOString() : undefined,
        status: 'TODO',
      });
      setCreatedTasksMap((prev) => ({ ...prev, [index]: true }));
      toast.success(`Đã tạo công việc: "${item.task}"`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Lỗi tạo công việc');
    } finally {
      setCreatingTaskIndex(null);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-4xl bg-card border border-border rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Header Banner */}
        <div className="p-6 border-b border-border bg-muted/20 flex items-start justify-between gap-4">
          <div className="space-y-1.5 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <MeetingScopeBadge scope={meeting.scopeType} />
              {getUserAttendanceBadge()}
              {meeting.project && (
                <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                  Dự án: {meeting.project.name}
                </span>
              )}
            </div>

            <h2 className="text-lg font-bold text-foreground tracking-tight">
              {meeting.title}
            </h2>

            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {start.toLocaleDateString('vi-VN', {
                  weekday: 'short',
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                })}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {start.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} -{' '}
                {end.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                Tổ chức: {meeting.createdBy?.name}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {meeting.status !== 'CANCELLED' && (
              <button
                onClick={() => {
                  onClose();
                  navigate(`/meetings/${meeting.id}/prepare`);
                }}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all shadow-xs ${
                  isOngoing
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white animate-pulse'
                    : 'bg-primary hover:bg-primary/90 text-primary-foreground'
                }`}
              >
                <Video className="w-3.5 h-3.5" />
                {isOngoing ? 'Vào phòng ngay' : 'Vào phòng họp'}
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-border px-6 bg-card">
          <button
            onClick={() => setActiveTab('ai')}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'ai'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            Tài liệu Tóm tắt AI
            {aiSummary && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
          </button>

          <button
            onClick={() => setActiveTab('transcript')}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'transcript'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileText className="w-4 h-4" />
            Kịch bản thoại ({transcripts.length})
          </button>

          <button
            onClick={() => setActiveTab('attendees')}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'attendees'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Users className="w-4 h-4" />
            Thành viên ({meeting.attendees.length})
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* ================= TAB 1: AI SUMMARY ================= */}
          {activeTab === 'ai' && (
            <div className="space-y-5">
              {/* Actions Toolbar */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-muted/30 border border-border">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    Bộ xử lý: <strong>WorkSync AI Intelligence</strong>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {aiSummary && (
                    <button
                      onClick={handleExportDoc}
                      disabled={exportingDoc}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
                    >
                      {exportingDoc ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <FileText className="w-3.5 h-3.5 text-blue-500" />
                      )}
                      Xuất ClickUp Docs
                    </button>
                  )}

                  {canManage && (
                    <button
                      onClick={handleGenerateAi}
                      disabled={generating}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      {generating ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Đang phân tích...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          {aiSummary ? 'Tạo lại tóm tắt' : 'Tạo biên bản AI ngay'}
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {loadingSummary ? (
                <div className="py-20 flex justify-center">
                  <Loader2 className="w-7 h-7 animate-spin text-primary" />
                </div>
              ) : !aiSummary ? (
                <div className="text-center py-16 px-4 bg-muted/20 border border-dashed border-border rounded-3xl">
                  <Bot className="w-10 h-10 text-primary/40 mx-auto mb-2" />
                  <h3 className="text-sm font-bold text-foreground">Chưa có Biên bản AI</h3>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                    {canManage
                      ? 'Bấm "Tạo biên bản AI ngay" để Trợ lý AI đọc toàn bộ kịch bản cuộc họp và xuất cấu trúc tóm tắt chuyên nghiệp.'
                      : 'Người chủ trì hoặc Quản lý dự án có thể kích hoạt tạo Biên bản AI cho cuộc họp này.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Executive Summary */}
                  <div className="p-5 rounded-2xl bg-card border border-border shadow-xs space-y-2">
                    <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
                      <FileText className="w-4 h-4" />
                      Tóm tắt điều hành (Executive Summary)
                    </div>
                    <AiFormattedContent content={aiSummary.summary} className="text-xs" />
                  </div>

                  {/* Decisions */}
                  {aiSummary.decisions && aiSummary.decisions.length > 0 && (
                    <div className="p-5 rounded-2xl bg-card border border-emerald-500/20 bg-emerald-500/5 shadow-xs space-y-3">
                      <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider">
                        <CheckCircle2 className="w-4 h-4" />
                        Các quyết định đã chốt ({aiSummary.decisions.length})
                      </div>
                      <ul className="space-y-2">
                        {aiSummary.decisions.map((dec, i) => (
                          <li key={i} className="flex items-start gap-2.5 text-xs text-foreground">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                            <span className="font-medium">{dec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Action Items */}
                  {aiSummary.actionItems && aiSummary.actionItems.length > 0 && (
                    <div className="p-5 rounded-2xl bg-card border border-border shadow-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-xs uppercase tracking-wider">
                          <ListTodo className="w-4 h-4" />
                          Công việc cần làm ({aiSummary.actionItems.length})
                        </div>
                        {meeting.projectId && (
                          <span className="text-[11px] text-muted-foreground">
                            Hỗ trợ 1-click tạo Task dự án
                          </span>
                        )}
                      </div>

                      <div className="space-y-2">
                        {aiSummary.actionItems.map((item, idx) => {
                          const isCreated = createdTasksMap[idx];
                          const isCreating = creatingTaskIndex === idx;

                          return (
                            <div
                              key={idx}
                              className="p-3.5 rounded-xl bg-muted/40 border border-border/70 flex items-start justify-between gap-3 text-xs"
                            >
                              <div className="space-y-1 min-w-0 flex-1">
                                <p className="font-semibold text-foreground leading-snug">
                                  {item.task}
                                </p>
                                <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                                  {item.assignee && (
                                    <span className="inline-flex items-center gap-1 font-medium text-foreground">
                                      <User className="w-3 h-3 text-primary" />
                                      {item.assignee}
                                    </span>
                                  )}
                                  {item.deadline && (
                                    <span className="inline-flex items-center gap-1 text-slate-500">
                                      <Clock className="w-3 h-3" />
                                      {item.deadline}
                                    </span>
                                  )}
                                  {item.priority && (
                                    <span
                                      className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                                        item.priority === 'HIGH'
                                          ? 'bg-red-500/10 text-red-600'
                                          : item.priority === 'MEDIUM'
                                          ? 'bg-amber-500/10 text-amber-600'
                                          : 'bg-slate-500/10 text-slate-600'
                                      }`}
                                    >
                                      {item.priority}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {meeting.projectId && (
                                <button
                                  onClick={() => handleCreateTask(item, idx)}
                                  disabled={isCreated || isCreating}
                                  className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                                    isCreated
                                      ? 'bg-emerald-500/10 text-emerald-600 cursor-default'
                                      : 'bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground'
                                  }`}
                                >
                                  {isCreating ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : isCreated ? (
                                    <>
                                      <CheckCircle2 className="w-3 h-3" />
                                      Đã tạo
                                    </>
                                  ) : (
                                    <>
                                      <Plus className="w-3 h-3" />
                                      Tạo Task
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Risks & Questions */}
                  {aiSummary.risksAndQuestions &&
                    ((aiSummary.risksAndQuestions.risks &&
                      aiSummary.risksAndQuestions.risks.length > 0) ||
                      (aiSummary.risksAndQuestions.openQuestions &&
                        aiSummary.risksAndQuestions.openQuestions.length > 0)) && (
                      <div className="p-5 rounded-2xl bg-card border border-amber-500/20 bg-amber-500/5 shadow-xs space-y-3">
                        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-xs uppercase tracking-wider">
                          <AlertTriangle className="w-4 h-4" />
                          Rủi ro & Vấn đề tồn đọng
                        </div>

                        {aiSummary.risksAndQuestions.risks &&
                          aiSummary.risksAndQuestions.risks.length > 0 && (
                            <ul className="space-y-1.5 text-xs text-foreground">
                              {aiSummary.risksAndQuestions.risks.map((r, i) => (
                                <li key={i} className="flex items-start gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                                  <span>{r}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                      </div>
                    )}
                </div>
              )}
            </div>
          )}

          {/* ================= TAB 2: TRANSCRIPTS ================= */}
          {activeTab === 'transcript' && (
            <div className="space-y-3">
              {loadingTranscripts ? (
                <div className="py-20 flex justify-center">
                  <Loader2 className="w-7 h-7 animate-spin text-primary" />
                </div>
              ) : transcripts.length === 0 ? (
                <div className="text-center py-16 px-4 bg-muted/20 border border-dashed border-border rounded-3xl">
                  <MessageSquare className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-foreground">
                    Chưa có kịch bản thoại nào được ghi lại cho cuộc họp này
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {transcripts.map((t) => (
                    <div
                      key={t.id}
                      className="p-3.5 rounded-xl bg-card border border-border text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">{t.speakerName}</span>
                          {t.speakerRole && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-muted font-medium">
                              {t.speakerRole}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px]">
                          {new Date(t.timestamp).toLocaleTimeString('vi-VN')}
                        </span>
                      </div>
                      <p className="text-foreground leading-relaxed pl-1">{t.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ================= TAB 3: ATTENDEES ================= */}
          {activeTab === 'attendees' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {meeting.attendees.map((att) => (
                  <div
                    key={att.id}
                    className="p-3.5 rounded-2xl bg-card border border-border flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 uppercase overflow-hidden">
                        {att.user.avatar ? (
                          <img
                            src={att.user.avatar}
                            alt={att.user.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          att.user.name.charAt(0)
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground truncate">{att.user.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{att.user.email}</p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {att.joinedAt ? (
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600">
                          Đã tham gia ({Math.round(att.totalDurationSeconds / 60)}p)
                        </span>
                      ) : att.rsvp === 'ACCEPTED' ? (
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-600">
                          Đồng ý
                        </span>
                      ) : att.rsvp === 'DECLINED' ? (
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-600">
                          Từ chối
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-600">
                          Chờ
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};
