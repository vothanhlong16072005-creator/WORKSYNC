import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  ClipboardEdit,
  Clock,
  Download,
  FileText,
  HelpCircle,
  ListTodo,
  Loader2,
  Mic,
  Plus,
  Search,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { AiFormattedContent } from '@/components/ui/AiFormattedContent';
import { meetingApi } from '../api/meeting.api';
import type {
  ActionItem,
  Meeting,
  MeetingSummaryResult,
  MeetingTranscriptChunk,
} from '../types/meeting.types';

interface MeetingAiDrawerProps {
  meeting: Meeting;
  isOpen: boolean;
  onClose: () => void;
  isTranscribing: boolean;
  transcripts: MeetingTranscriptChunk[];
  canManage: boolean;
}

/**
 * Mẫu nội dung tham chiếu tiếng Việt dùng cho demo.
 * Người dùng bấm "Tải mẫu demo" → AI sinh biên bản bám theo đúng nội dung này.
 */
const DEMO_REFERENCE_SAMPLE = `BIÊN BẢN CUỘC HỌP — DỰ ÁN TTĐN (MẪU THAM CHIẾU)

I. THÀNH PHẦN THAM DỰ
- Người chủ trì: PM dự án
- Thành viên: các thành viên trong nhóm dự án
- Thư ký: ghi chép AI

II. NỘI DUNG THẢO LUẬN
1. Tiến độ phát triển module họp trực tuyến đạt khoảng 80%, đã hoàn thành phần WebRTC signaling và giao diện phòng họp.
2. Vấn đề nhận diện giọng nói tiếng Việt chưa ổn định do phụ thuộc Web Speech API của trình duyệt, đã quyết định bổ sung cơ chế nội dung tham chiếu để biên bản AI vẫn chính xác.
3. Vấn đề người vào sau không thấy camera của người đã vào trước, đã xác định nguyên nhân do đồng bộ track chưa hoàn chỉnh, dự kiến khắc phục trong đợt sprint tới.
4. Quyết định sử dụng mô hình mesh WebRTC cho các quy mô nhóm nhỏ dưới 10 người, chưa triển khai SFU ở thời điểm hiện tại.

III. QUYẾT ĐỊNH
- Thống nhất triển khai tính năng biên bản AI với nội dung tham chiếu trước khi cải thiện chất lượng nhận diện giọng nói.
- Thống nhất ưu tiên ổn định kết nối WebRTC và phân loại camera/màn hình chia sẻ trước khi tối ưu chất lượng hình ảnh.

IV. CÔNG VIỆC CẦN LÀM
- PM: Hoàn thiện cơ chế đồng bộ track media để người vào sau thấy đầy đủ camera của người đã vào trước, hạn cuối tuần này, ưu tiên cao.
- Frontend: Sửa lỗi phân loại camera và màn hình chia sẻ, đảm bảo màn hình share hiển thị toàn màn hình cho người xem, hạn cuối tuần này, ưu tiên cao.
- Backend: Bổ sung endpoint truyền msid track để đồng bộ loại media, hạn cuối tuần này, ưu tiên trung bình.
- QA: Kiểm thử lại kịch bản 2 người vào phòng lệch thời điểm, hạn cuối tuần này, ưu tiên trung bình.

V. RỦI RO
- Chất lượng nhận diện giọng nói tiếng Việt phụ thuộc vào pack ngôn ngữ của trình duyệt, nếu thiếu sẽ ảnh hưởng đến chất lượng bản ghi âm.
- Mô hình mesh chưa đáp ứng tốt khi số người tham gia vượt quá 10, có nguy cơ nghẽn băng thông.
- Chưa cấu hình TURN server, mạng nội bộ chặn UDP sẽ không kết nối được.`;

export const MeetingAiDrawer: React.FC<MeetingAiDrawerProps> = ({
  meeting,
  isOpen,
  onClose,
  isTranscribing,
  transcripts,
  canManage,
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'feed' | 'ai'>('ai');
  const [searchQuery, setSearchQuery] = useState('');
  const [language, setLanguage] = useState<'VI' | 'EN'>('VI');

  // AI Summary state
  const [aiSummary, setAiSummary] = useState<MeetingSummaryResult | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [generating, setGenerating] = useState(false);

  /**
   * Nội dung tham chiếu — dùng để định hướng AI khi STT tiếng Việt chưa chính xác.
   * AI sẽ bám theo nội dung này thay vì tự suy diễn từ transcript rác.
   */
  const [referenceContent, setReferenceContent] = useState('');
  const [showReference, setShowReference] = useState(false);

  // Export to document state
  const [exportingDoc, setExportingDoc] = useState(false);

  // 1-click Task Creation loading map: index -> boolean
  const [creatingTaskIndex, setCreatingTaskIndex] = useState<number | null>(null);
  const [createdTasksMap, setCreatedTasksMap] = useState<Record<number, boolean>>({});

  const feedBottomRef = useRef<HTMLDivElement>(null);

  // Load existing summary on open
  useEffect(() => {
    if (!isOpen) return;

    setLoadingSummary(true);
    meetingApi
      .getAiSummary(meeting.id)
      .then((res) => {
        if (res.hasSummary) {
          setAiSummary(res);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingSummary(false));
  }, [isOpen, meeting.id]);

  // Auto-scroll feed on new chunks
  useEffect(() => {
    if (activeTab === 'feed' && feedBottomRef.current) {
      feedBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcripts, activeTab]);

  if (!isOpen) return null;

  // Filter transcripts by search
  const filteredTranscripts = transcripts.filter((chunk) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      chunk.text.toLowerCase().includes(query) ||
      chunk.speakerName.toLowerCase().includes(query)
    );
  });

  // Action: Generate AI Summary (Constraint 3)
  const handleGenerateSummary = async () => {
    setGenerating(true);
    try {
      toast.info('Trợ lý AI đang phân tích toàn bộ kịch bản cuộc họp...');
      const res = await meetingApi.generateAiSummary(meeting.id, {
        language,
        referenceContent: referenceContent.trim() || undefined,
      });
      setAiSummary(res);
      toast.success('Đã tạo thành công biên bản AI!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Lỗi khi tạo biên bản AI');
    } finally {
      setGenerating(false);
    }
  };

  // Action: Export to ClickUp Docs (Constraint 3)
  const handleExportDoc = async () => {
    setExportingDoc(true);
    try {
      const res = await meetingApi.exportToDocument(meeting.id);
      toast.success(`Đã xuất biên bản sang Document: "${res.title}"`, {
        action: {
          label: 'Xem tài liệu',
          onClick: () => navigate(`/documents/${res.id}`),
        },
      });
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Lỗi khi xuất sang Document');
    } finally {
      setExportingDoc(false);
    }
  };

  // Action: 1-click Create Task from Action Item (Constraint 2)
  const handleCreateTaskFromAction = async (item: ActionItem, index: number) => {
    if (!meeting.projectId) {
      toast.error('Cuộc họp này không liên kết với dự án cụ thể để tạo Task!');
      return;
    }

    setCreatingTaskIndex(index);
    try {
      await apiClient.post('/tasks', {
        title: item.task,
        description: `Được tạo tự động từ Biên bản AI cuộc họp: "${meeting.title}".\nNgười phụ trách dự kiến: ${item.assignee || 'Chưa gán'}`,
        projectId: meeting.projectId,
        assigneeId: item.assigneeId || undefined,
        priority: item.priority || 'MEDIUM',
        dueDate: item.deadline ? new Date(item.deadline).toISOString() : undefined,
        status: 'TODO',
      });

      setCreatedTasksMap((prev) => ({ ...prev, [index]: true }));
      toast.success(`Đã tạo thành công công việc: "${item.task}"!`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Lỗi khi tạo công việc');
    } finally {
      setCreatingTaskIndex(null);
    }
  };

  // Action: Download raw transcript as .txt file
  const handleDownloadTranscript = () => {
    if (transcripts.length === 0) {
      toast.error('Chưa có dữ liệu lời thoại để tải xuống');
      return;
    }
    const lines = transcripts.map((t) => {
      const time = new Date(t.timestamp).toLocaleTimeString('vi-VN');
      return `[${time}] ${t.speakerName}: ${t.text}`;
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Transcript-${meeting.title.replace(/\s+/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Đã tải xuống kịch bản cuộc họp');
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-card border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-muted/30">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Bot className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-foreground truncate">
              Trợ lý AI & Kịch bản Cuộc họp
            </h2>
            <p className="text-[11px] text-muted-foreground truncate">{meeting.title}</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {isTranscribing && (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-500/10 text-red-500 animate-pulse mr-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
              Đang ghi âm
            </span>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-border px-5 bg-card">
        <button
          onClick={() => setActiveTab('ai')}
          className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'ai'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Biên bản AI
          {aiSummary && (
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('feed')}
          className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'feed'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Mic className="w-3.5 h-3.5" />
          Kịch bản trực tiếp ({transcripts.length})
        </button>
      </div>

      {/* Content Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* ================= TAB 1: LIVE FEED ================= */}
        {activeTab === 'feed' && (
          <div className="space-y-4">
            {/* Search & Actions */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Tìm kiếm nội dung lời thoại..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-muted/40 border border-border text-xs focus:outline-hidden focus:border-primary"
                />
              </div>

              <button
                onClick={handleDownloadTranscript}
                title="Tải xuống tệp .txt"
                className="p-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>

            {/* Transcript Chunks List */}
            {filteredTranscripts.length === 0 ? (
              <div className="text-center py-16 px-4 bg-muted/20 border border-dashed border-border rounded-2xl">
                <Mic className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-xs font-semibold text-foreground">
                  {transcripts.length === 0
                    ? 'Chưa có lời thoại nào được ghi lại'
                    : 'Không tìm thấy lời thoại phù hợp'}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1 max-w-xs mx-auto">
                  {isTranscribing
                    ? 'Hãy bật Micro và bắt đầu phát biểu. Lời nói sẽ tự động chuyển thành văn bản tại đây.'
                    : 'Chủ trì có thể bấm "Bắt đầu ghi biên bản AI" để kích hoạt nhận diện giọng nói.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTranscripts.map((chunk) => (
                  <div
                    key={chunk.id}
                    className="p-3 rounded-xl bg-card border border-border hover:border-border/80 transition-shadow text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                          {chunk.speakerName.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold text-foreground">
                          {chunk.speakerName}
                        </span>
                        {chunk.speakerRole && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground font-medium">
                            {chunk.speakerRole}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px]">
                        {new Date(chunk.timestamp).toLocaleTimeString('vi-VN')}
                      </span>
                    </div>
                    <p className="text-foreground leading-relaxed pl-6.5">{chunk.text}</p>
                  </div>
                ))}
                <div ref={feedBottomRef} />
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 2: AI SUMMARY ================= */}
        {activeTab === 'ai' && (
          <div className="space-y-5">
            {/* Top Toolbar: Language Selector & Generate Button */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-medium">Ngôn ngữ:</span>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as 'VI' | 'EN')}
                  className="px-2 py-1 rounded bg-background border border-border text-xs text-foreground focus:outline-hidden"
                >
                  <option value="VI">Tiếng Việt</option>
                  <option value="EN">English</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                {aiSummary && (
                  <button
                    onClick={handleExportDoc}
                    disabled={exportingDoc}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
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
                    onClick={handleGenerateSummary}
                    disabled={generating}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Đang phân tích...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        {aiSummary ? 'Tạo lại' : 'Tạo biên bản AI'}
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Nội dung tham chiếu — định hướng biên bản AI (hữu ích khi STT tiếng Việt chưa chính xác) */}
            {canManage && (
              <div className="p-3 rounded-xl bg-amber-50/40 border border-amber-200">
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setShowReference((v) => !v)}
                    className="flex items-center gap-1.5 text-[11px] font-bold text-amber-800 uppercase tracking-wider hover:text-amber-900 transition-colors"
                  >
                    <ClipboardEdit className="w-3.5 h-3.5" />
                    Nội dung tham chiếu
                    {referenceContent.trim() && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 text-[10px] font-bold">
                        Đã nhập
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setReferenceContent(DEMO_REFERENCE_SAMPLE)}
                    className="text-[10px] font-semibold text-amber-700 hover:text-amber-900 px-2 py-1 rounded-md hover:bg-amber-100 transition-colors"
                  >
                    Tải mẫu demo
                  </button>
                </div>

                {showReference && (
                  <div className="mt-2.5 space-y-2">
                    <textarea
                      value={referenceContent}
                      onChange={(e) => setReferenceContent(e.target.value)}
                      rows={8}
                      maxLength={20000}
                      placeholder={
                        'Nhập nội dung chuẩn của biên bản (ví dụ: các đầu việc, quyết định, rủi ro cần nêu). AI sẽ tạo biên bản bám theo nội dung này thay vì dựa hoàn toàn vào giọng nói được ghi âm.'
                      }
                      className="w-full px-3 py-2 rounded-lg bg-white border border-amber-200 text-xs text-foreground focus:outline-hidden focus:border-amber-400 leading-relaxed"
                    />
                    <p className="text-[10px] text-amber-700/80">
                      Khi có nội dung tham chiếu, AI sẽ bám theo nội dung này làm chuẩn. Lời thoại
                      ghi âm chỉ dùng bổ sung. Số ký tự: {referenceContent.length}/20000
                    </p>
                  </div>
                )}
              </div>
            )}

            {loadingSummary ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : !aiSummary ? (
              <div className="text-center py-16 px-4 bg-muted/20 border border-dashed border-border rounded-2xl">
                <Bot className="w-8 h-8 text-primary/40 mx-auto mb-2" />
                <h3 className="text-xs font-bold text-foreground">Chưa có Biên bản AI</h3>
                <p className="text-[11px] text-muted-foreground mt-1 max-w-xs mx-auto">
                  Bấm nút <strong>"Tạo biên bản AI"</strong> để Trợ lý AI tổng hợp toàn
                  bộ lời thoại cuộc họp thành các mục tóm tắt, quyết định và danh sách việc cần làm.
                </p>
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in duration-200">
                {/* 1. Executive Summary Card */}
                <div className="p-4 rounded-2xl bg-card border border-border shadow-xs space-y-2">
                  <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
                    <FileText className="w-4 h-4" />
                    Tóm tắt điều hành
                  </div>
                  <AiFormattedContent content={aiSummary.summary} className="text-xs" />
                </div>

                {/* 2. Key Decisions Card */}
                {aiSummary.decisions && aiSummary.decisions.length > 0 && (
                  <div className="p-4 rounded-2xl bg-card border border-emerald-500/20 bg-emerald-500/5 shadow-xs space-y-2.5">
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider">
                      <CheckCircle2 className="w-4 h-4" />
                      Quyết định đã thống nhất ({aiSummary.decisions.length})
                    </div>
                    <ul className="space-y-2">
                      {aiSummary.decisions.map((decision, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-foreground">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                          <span className="font-medium">{decision}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 3. Action Items Card (Constraint 2: 1-click Task creation) */}
                {aiSummary.actionItems && aiSummary.actionItems.length > 0 && (
                  <div className="p-4 rounded-2xl bg-card border border-border shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-xs uppercase tracking-wider">
                        <ListTodo className="w-4 h-4" />
                        Công việc cần làm ({aiSummary.actionItems.length})
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {meeting.projectId ? 'Có thể tạo Task dự án 1-click' : ''}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {aiSummary.actionItems.map((item, idx) => {
                        const isCreated = createdTasksMap[idx];
                        const isCreating = creatingTaskIndex === idx;

                        return (
                          <div
                            key={idx}
                            className="p-3 rounded-xl bg-muted/40 border border-border/70 flex items-start justify-between gap-3 text-xs"
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

                            {/* 1-Click Task Create Button */}
                            {meeting.projectId && (
                              <button
                                onClick={() => handleCreateTaskFromAction(item, idx)}
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

                {/* 4. Risks & Questions Card */}
                {aiSummary.risksAndQuestions &&
                  ((aiSummary.risksAndQuestions.risks &&
                    aiSummary.risksAndQuestions.risks.length > 0) ||
                    (aiSummary.risksAndQuestions.openQuestions &&
                      aiSummary.risksAndQuestions.openQuestions.length > 0)) && (
                    <div className="p-4 rounded-2xl bg-card border border-amber-500/20 bg-amber-500/5 shadow-xs space-y-3">
                      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-xs uppercase tracking-wider">
                        <AlertTriangle className="w-4 h-4" />
                        Rủi ro & Vấn đề tồn đọng
                      </div>

                      {aiSummary.risksAndQuestions.risks &&
                        aiSummary.risksAndQuestions.risks.length > 0 && (
                          <div className="space-y-1.5">
                            <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                              Rủi ro kỹ thuật / tiến độ:
                            </span>
                            <ul className="space-y-1 text-xs text-foreground">
                              {aiSummary.risksAndQuestions.risks.map((r, i) => (
                                <li key={i} className="flex items-start gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                                  <span>{r}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                      {aiSummary.risksAndQuestions.openQuestions &&
                        aiSummary.risksAndQuestions.openQuestions.length > 0 && (
                          <div className="space-y-1.5 pt-2 border-t border-amber-500/20">
                            <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1">
                              <HelpCircle className="w-3 h-3" />
                              Câu hỏi thảo luận chưa ngã ngũ:
                            </span>
                            <ul className="space-y-1 text-xs text-foreground">
                              {aiSummary.risksAndQuestions.openQuestions.map((q, i) => (
                                <li key={i} className="flex items-start gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                                  <span>{q}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                    </div>
                  )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
