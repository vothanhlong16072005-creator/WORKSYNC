import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Download,
  HelpCircle,
  Printer,
  UserCheck,
  UserX,
  Users,
  XCircle,
  FileText,
  Sparkles,
  FileDown,
  Paperclip,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { meetingApi } from '../api/meeting.api';
import type { AttendanceReportData, MeetingSummaryResult } from '../types/meeting.types';

interface AttendanceReportProps {
  data: AttendanceReportData;
}

export const AttendanceReport: React.FC<AttendanceReportProps> = ({ data }) => {
  const { t } = useTranslation();
  const { meeting, metrics, details } = data;

  const [summary, setSummary] = useState<MeetingSummaryResult | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [isChatExpanded, setIsChatExpanded] = useState(false);

  const summaryText = summary?.summary || (summary as any)?.summaryText || '';
  const keyTopics: string[] = (summary as any)?.keyTopics || summary?.risksAndQuestions?.risks || [];
  const decisions: string[] = summary?.decisions || [];
  const actionItems: any[] = summary?.actionItems || [];

  // Load AI summary and chat history on mount
  useEffect(() => {
    if (!meeting.id) return;

    // 1. Fetch AI Summary
    meetingApi
      .getAiSummary(meeting.id)
      .then((res) => {
        if (res && res.hasSummary) {
          setSummary(res);
        } else if (meeting.minutes?.aiSummary) {
          setSummary({
            hasSummary: true,
            summary: meeting.minutes.aiSummary,
            actionItems: (meeting.minutes.actionItems as any[]) || [],
            decisions: (meeting.minutes.decisions as string[]) || [],
            risksAndQuestions: meeting.minutes.risksAndQuestions || { risks: [], openQuestions: [] },
            generatedAt: meeting.minutes.aiGeneratedAt || new Date().toISOString(),
          });
        }
      })
      .catch(() => {});

    // 2. Fetch Chat History & Files
    meetingApi
      .getChatHistory(meeting.id)
      .then((msgs) => {
        if (Array.isArray(msgs)) {
          setChatMessages(msgs);
        }
      })
      .catch(() => {});
  }, [meeting.id, meeting.minutes]);

  // Extract shared files from chat messages and linked documents
  const chatFiles = chatMessages
    .filter((m) => m.attachment && m.attachment.url)
    .map((m) => ({
      name: m.attachment.name,
      url: m.attachment.url,
      size: m.attachment.size,
      senderName: m.sender?.name || 'Thành viên',
      sentAt: m.createdAt,
    }));

  const linkedDocs = (meeting.documents || []).flatMap((doc: any) =>
    (doc.attachments || []).map((att: any) => ({
      name: att.fileName || doc.title,
      url: att.fileUrl,
      size: att.fileSize,
      senderName: doc.owner?.name || 'Tài liệu liên kết',
      sentAt: att.createdAt || doc.createdAt,
    })),
  );

  const allFiles = [...chatFiles, ...linkedDocs];

  // Handler to generate AI summary if not available
  const handleGenerateSummary = async () => {
    setIsGeneratingAi(true);
    try {
      const res = await meetingApi.generateAiSummary(meeting.id);
      setSummary(res);
      toast.success(t('meetings.ai_summary_generated', 'Đã tạo tóm tắt cuộc họp thành công!'));
    } catch (err: any) {
      toast.error(
        err.response?.data?.message ||
          t('meetings.ai_summary_error', 'Không thể tạo tóm tắt AI. Vui lòng thử lại.'),
      );
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // 1. Export Clean CSV
  const exportCSV = () => {
    const startStr = new Date(meeting.startTime).toLocaleString('vi-VN');
    const endStr = new Date(meeting.endTime).toLocaleString('vi-VN');

    const csvLines = [
      `"BÁO CÁO ĐIỂM DANH VÀ THỜI LƯỢNG CUỘC HỌP - WORKSYNC ENTERPRISE"`,
      `"Tên cuộc họp:","${meeting.title}"`,
      `"Thời gian:","${startStr} - ${endStr}"`,
      `"Người chủ trì:","${meeting.createdBy?.name || 'N/A'}"`,
      `"Phạm vi:","${meeting.scopeType === 'ONE_ON_ONE' ? 'Cuộc họp tự do' : meeting.scopeType === 'PROJECT' ? 'Dự án' : 'Phòng ban'}"`,
      `"Mã phòng:","${meeting.roomCode}"`,
      ``,
      `"TỔNG QUAN CHỈ SỐ"`,
      `"Tổng số người mời:",${metrics.totalInvited}`,
      `"Có mặt:",${metrics.presentCount},"${metrics.totalInvited > 0 ? Math.round((metrics.presentCount / metrics.totalInvited) * 100) : 0}%"`,
      `"Vắng mặt:",${metrics.absentCount}`,
      `"Từ chối:",${metrics.declinedCount}`,
      `"Chờ phản hồi:",${metrics.pendingCount}`,
      `"Thời lượng trung bình (phút):",${metrics.avgDurationMinutes}`,
      `"Tổng thời lượng họp (phút):",${Math.round(metrics.totalDurationSeconds / 60)}`,
      ``,
      `"DANH SÁCH CHI TIẾT ĐIỂM DANH THÀNH VIÊN"`,
      `"STT","Họ và tên","Email","Chức vụ","RSVP","Trạng thái điểm danh","Thời gian vào họp","Thời gian rời họp","Thời lượng (phút)"`,
      ...details.map((d, index) =>
        [
          index + 1,
          `"${d.name}"`,
          `"${d.email}"`,
          `"${d.role}"`,
          `"${d.rsvp === 'ACCEPTED' ? 'Chấp nhận' : d.rsvp === 'DECLINED' ? 'Từ chối' : 'Chờ phản hồi'}"`,
          `"${d.statusLabel}"`,
          d.joinedAt ? `"${new Date(d.joinedAt).toLocaleString('vi-VN')}"` : '""',
          d.leftAt ? `"${new Date(d.leftAt).toLocaleString('vi-VN')}"` : '""',
          d.durationMinutes,
        ].join(','),
      ),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + csvLines.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Bao_cao_diem_danh_${meeting.title.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 2. Export Word Document (.doc with rich HTML formatting)
  const exportWord = () => {
    const startStr = new Date(meeting.startTime).toLocaleString('vi-VN');
    const endStr = new Date(meeting.endTime).toLocaleString('vi-VN');

    const wordHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>Báo cáo cuộc họp: ${meeting.title}</title>
        <style>
          body {
            font-family: 'Calibri', 'Segoe UI', Arial, sans-serif;
            font-size: 11pt;
            line-height: 1.5;
            color: #1e293b;
            margin: 20mm;
          }
          .header-box {
            border-bottom: 2px solid #2563eb;
            padding-bottom: 8px;
            margin-bottom: 16px;
          }
          .company-name {
            font-size: 10pt;
            font-weight: bold;
            color: #2563eb;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          h1 {
            font-size: 18pt;
            color: #0f172a;
            margin: 6px 0 4px 0;
          }
          .subtitle {
            font-size: 10pt;
            color: #64748b;
          }
          h2 {
            font-size: 13pt;
            color: #1e3a8a;
            background-color: #f1f5f9;
            padding: 6px 10px;
            border-left: 4px solid #2563eb;
            margin-top: 20px;
            margin-bottom: 10px;
          }
          h3 {
            font-size: 11pt;
            color: #334155;
            margin-top: 12px;
            margin-bottom: 6px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
            margin-bottom: 14px;
          }
          th {
            background-color: #f8fafc;
            color: #334155;
            font-weight: bold;
            border: 1px solid #cbd5e1;
            padding: 8px 10px;
            text-align: left;
            font-size: 10pt;
          }
          td {
            border: 1px solid #cbd5e1;
            padding: 7px 10px;
            font-size: 10pt;
          }
          .summary-card {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 12px;
            margin-bottom: 12px;
          }
          .badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 9pt;
            font-weight: bold;
          }
          .badge-present { background-color: #dcfce7; color: #166534; }
          .badge-absent { background-color: #fee2e2; color: #991b1b; }
          .badge-declined { background-color: #f1f5f9; color: #475569; }
          .badge-pending { background-color: #fef3c7; color: #92400e; }
          ul { margin-top: 4px; margin-bottom: 8px; padding-left: 20px; }
          li { margin-bottom: 4px; }
          .footer-sign {
            margin-top: 35px;
            width: 100%;
          }
          .footer-sign td {
            border: none;
            padding: 10px;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="header-box">
          <div class="company-name">WORKSYNC ENTERPRISE PLATFORM • BÁO CÁO CUỘC HỌP & BIÊN BẢN</div>
          <h1>${meeting.title}</h1>
          <div class="subtitle">
            Thời gian: <b>${startStr} - ${endStr}</b> | Người chủ trì: <b>${meeting.createdBy?.name || 'N/A'}</b> | Mã phòng: <b>${meeting.roomCode}</b>
          </div>
        </div>

        <h2>I. TỔNG QUAN CHỈ SỐ CUỘC HỌP</h2>
        <table>
          <tr>
            <th width="30%">Chỉ số</th>
            <th width="20%">Số lượng</th>
            <th width="50%">Ghi chú</th>
          </tr>
          <tr>
            <td>Tổng số người được mời</td>
            <td><b>${metrics.totalInvited}</b></td>
            <td>Toàn bộ thành viên trong danh sách mời</td>
          </tr>
          <tr>
            <td>Thành viên có mặt</td>
            <td><b style="color: #166534;">${metrics.presentCount}</b></td>
            <td>Tỉ lệ tham dự: <b>${metrics.totalInvited > 0 ? Math.round((metrics.presentCount / metrics.totalInvited) * 100) : 0}%</b></td>
          </tr>
          <tr>
            <td>Vắng mặt</td>
            <td><b style="color: #991b1b;">${metrics.absentCount}</b></td>
            <td>Đã chấp nhận lời mời nhưng không vào họp</td>
          </tr>
          <tr>
            <td>Từ chối tham dự</td>
            <td><b>${metrics.declinedCount}</b></td>
            <td>Phản hồi từ chối trước giờ họp</td>
          </tr>
          <tr>
            <td>Chưa phản hồi</td>
            <td><b>${metrics.pendingCount}</b></td>
            <td>Chưa gửi phản hồi xác nhận</td>
          </tr>
          <tr>
            <td>Thời lượng họp trung bình</td>
            <td><b>${metrics.avgDurationMinutes} phút</b></td>
            <td>Tổng thời gian tích lũy: ${Math.round(metrics.totalDurationSeconds / 60)} phút</td>
          </tr>
        </table>

        ${
          summaryText
            ? `
        <h2>II. BÁO CÁO TÓM TẮT NỘI DUNG CUỘC HỌP (AI SUMMARY)</h2>
        <div class="summary-card">
          <h3>1. Tóm tắt tổng quan:</h3>
          <p>${summaryText.replace(/\n/g, '<br/>')}</p>

          ${
            keyTopics && keyTopics.length > 0
              ? `
          <h3>2. Các chủ đề trọng tâm thảo luận:</h3>
          <ul>
            ${keyTopics.map((topic: string) => `<li>${topic}</li>`).join('')}
          </ul>`
              : ''
          }

          ${
            decisions && decisions.length > 0
              ? `
          <h3>3. Quyết định đã thống nhất:</h3>
          <ul>
            ${decisions.map((dec) => `<li><b>${dec}</b></li>`).join('')}
          </ul>`
              : ''
          }

          ${
            actionItems && actionItems.length > 0
              ? `
          <h3>4. Kế hoạch hành động & Phân công công việc (Action Items):</h3>
          <table>
            <tr>
              <th width="50%">Nội dung công việc</th>
              <th width="25%">Người phụ trách</th>
              <th width="25%">Hạn chót</th>
            </tr>
            ${actionItems
              .map(
                (item: any) => `
              <tr>
                <td>${item.task || item.description || item}</td>
                <td><b>${item.assignee || 'Chưa giao'}</b></td>
                <td>${item.deadline || item.dueDate || 'Sớm nhất'}</td>
              </tr>
            `,
              )
              .join('')}
          </table>`
              : ''
          }
        </div>
        `
            : ''
        }

        <h2>III. BẢNG ĐIỂM DANH CHI TIẾT THÀNH VIÊN</h2>
        <table>
          <tr>
            <th width="5%">STT</th>
            <th width="22%">Họ và tên</th>
            <th width="23%">Email</th>
            <th width="12%">Chức vụ</th>
            <th width="13%">Điểm danh</th>
            <th width="12%">Giờ vào</th>
            <th width="13%">Thời lượng</th>
          </tr>
          ${details
            .map(
              (d, i) => `
            <tr>
              <td style="text-align: center;">${i + 1}</td>
              <td><b>${d.name}</b></td>
              <td>${d.email}</td>
              <td>${d.role}</td>
              <td>
                <span class="badge ${
                  d.isPresent
                    ? 'badge-present'
                    : d.rsvp === 'DECLINED'
                    ? 'badge-declined'
                    : d.rsvp === 'ACCEPTED'
                    ? 'badge-absent'
                    : 'badge-pending'
                }">
                  ${d.statusLabel}
                </span>
              </td>
              <td>${d.joinedAt ? new Date(d.joinedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
              <td style="text-align: right;">${d.durationMinutes > 0 ? d.durationMinutes + ' phút' : '—'}</td>
            </tr>
          `,
            )
            .join('')}
        </table>

        ${
          allFiles.length > 0
            ? `
        <h2>IV. DANH SÁCH TÀI LIỆU & TỆP ĐÍNH KÈM CHIA SẺ</h2>
        <table>
          <tr>
            <th width="5%">STT</th>
            <th width="45%">Tên tệp</th>
            <th width="25%">Người chia sẻ</th>
            <th width="25%">Thời gian</th>
          </tr>
          ${allFiles
            .map(
              (f, i) => `
            <tr>
              <td style="text-align: center;">${i + 1}</td>
              <td><b>${f.name}</b></td>
              <td>${f.senderName}</td>
              <td>${new Date(f.sentAt).toLocaleString('vi-VN')}</td>
            </tr>
          `,
            )
            .join('')}
        </table>
        `
            : ''
        }

        <table class="footer-sign">
          <tr>
            <td width="50%">
              <b>NGƯỜI LẬP BÁO CÁO</b><br/>
              <i>(Ký và ghi rõ họ tên)</i><br/><br/><br/><br/>
              <b>Hệ thống WorkSync</b>
            </td>
            <td width="50%">
              <b>NGƯỜI CHỦ TRÌ CUỘC HỌP</b><br/>
              <i>(Ký và ghi rõ họ tên)</i><br/><br/><br/><br/>
              <b>${meeting.createdBy?.name || 'Chủ trì'}</b>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(['\uFEFF', wordHtml], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Bao_cao_cuoc_hop_${meeting.title.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(t('meetings.exported_word_success', 'Đã tải xuống file Word (.doc) thành công!'));
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* 6 Key Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* 1. Total Invited */}
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-1">
            <Users className="w-4 h-4 text-blue-600" />
            <span>{t('meetings.total_invited', 'Tổng mời')}</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">{metrics.totalInvited}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Người trong scope</div>
        </div>

        {/* 2. Present */}
        <div className="bg-white border border-emerald-200 p-4 rounded-2xl shadow-xs bg-emerald-50/20">
          <div className="flex items-center gap-2 text-emerald-700 text-xs font-semibold mb-1">
            <UserCheck className="w-4 h-4 text-emerald-600" />
            <span>{t('meetings.present', 'Có mặt')}</span>
          </div>
          <div className="text-2xl font-bold text-emerald-700">{metrics.presentCount}</div>
          <div className="text-[11px] text-emerald-600 mt-0.5">
            {metrics.totalInvited > 0
              ? `${Math.round((metrics.presentCount / metrics.totalInvited) * 100)}% tham dự`
              : '0%'}
          </div>
        </div>

        {/* 3. Absent */}
        <div className="bg-white border border-rose-200 p-4 rounded-2xl shadow-xs bg-rose-50/20">
          <div className="flex items-center gap-2 text-rose-700 text-xs font-semibold mb-1">
            <UserX className="w-4 h-4 text-rose-600" />
            <span>{t('meetings.absent', 'Vắng mặt')}</span>
          </div>
          <div className="text-2xl font-bold text-rose-700">{metrics.absentCount}</div>
          <div className="text-[11px] text-rose-600 mt-0.5">Đã RSVP nhưng không vào</div>
        </div>

        {/* 4. Declined */}
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-1">
            <XCircle className="w-4 h-4 text-slate-400" />
            <span>{t('meetings.declined', 'Từ chối')}</span>
          </div>
          <div className="text-2xl font-bold text-slate-800">{metrics.declinedCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">RSVP: DECLINED</div>
        </div>

        {/* 5. Pending */}
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-1">
            <HelpCircle className="w-4 h-4 text-amber-500" />
            <span>{t('meetings.pending', 'Chờ phản hồi')}</span>
          </div>
          <div className="text-2xl font-bold text-slate-800">{metrics.pendingCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Chưa gửi phản hồi</div>
        </div>

        {/* 6. Avg Duration */}
        <div className="bg-white border border-blue-200 p-4 rounded-2xl shadow-xs bg-blue-50/20">
          <div className="flex items-center gap-2 text-blue-700 text-xs font-semibold mb-1">
            <Clock className="w-4 h-4 text-blue-600" />
            <span>{t('meetings.avg_duration', 'Thời lượng TB')}</span>
          </div>
          <div className="text-2xl font-bold text-blue-700">{metrics.avgDurationMinutes}p</div>
          <div className="text-[11px] text-blue-600 mt-0.5">
            Tổng: {Math.round(metrics.totalDurationSeconds / 60)} phút
          </div>
        </div>
      </div>

      {/* Action Header: Export CSV, Word (.doc), Print */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            {t('meetings.export_options_title', 'Tùy chọn xuất báo cáo & In ấn')}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {t('meetings.export_options_desc', 'Tải báo cáo tóm tắt, biên bản họp và bảng điểm danh chuyên nghiệp')}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* CSV Export */}
          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition-colors shadow-2xs"
            title="Xuất bảng điểm danh CSV chuẩn UTF-8"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            <span>Xuất Excel / CSV</span>
          </button>

          {/* Word Export */}
          <button
            onClick={exportWord}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-xs cursor-pointer active:scale-[0.98]"
            title="Tải báo cáo cuộc họp format Word (.doc)"
          >
            <FileDown className="w-3.5 h-3.5 text-white" />
            <span>Tải file Word (.doc)</span>
          </button>

          {/* Print */}
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition-colors shadow-2xs"
            title="In báo cáo hoặc lưu file PDF"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span>In báo cáo</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: AI SUMMARY & MINUTES REPORT */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shadow-2xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {t('meetings.ai_summary_title', 'Báo cáo tóm tắt cuộc họp & Biên bản AI')}
              </h3>
              <p className="text-xs text-slate-500">
                {summary?.generatedAt
                  ? `Được tạo tự động vào ${new Date(summary.generatedAt).toLocaleString('vi-VN')}`
                  : 'Trợ lý AI tổng hợp nội dung thảo luận và các hành động cần thực hiện'}
              </p>
            </div>
          </div>

          <button
            onClick={handleGenerateSummary}
            disabled={isGeneratingAi}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-xl transition-colors disabled:opacity-50"
          >
            {isGeneratingAi ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            <span>{summary ? 'Làm mới tóm tắt AI' : 'Tạo tóm tắt AI ngay'}</span>
          </button>
        </div>

        <div className="p-5">
          {summaryText ? (
            <div className="space-y-5">
              {/* Summary text */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>Tóm tắt tổng quan</span>
                </h4>
                <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                  {summaryText}
                </p>
              </div>

              {/* Grid: Key topics & Decisions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Key Topics */}
                {keyTopics && keyTopics.length > 0 && (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                      💡 Chủ đề trọng tâm thảo luận
                    </h4>
                    <ul className="space-y-1.5 text-xs text-slate-700">
                      {keyTopics.map((topic: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                          <span>{topic}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Decisions */}
                {decisions && decisions.length > 0 && (
                  <div className="p-4 rounded-xl bg-emerald-50/40 border border-emerald-200/80">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 mb-2">
                      🎯 Quyết định đã thống nhất
                    </h4>
                    <ul className="space-y-1.5 text-xs text-emerald-900">
                      {decisions.map((dec, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                          <span className="font-medium">{dec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Action items */}
              {actionItems && actionItems.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2.5">
                    📋 Kế hoạch hành động & Phân công công việc (Action Items)
                  </h4>
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                        <tr>
                          <th className="px-4 py-2.5">Nhiệm vụ</th>
                          <th className="px-4 py-2.5">Người phụ trách</th>
                          <th className="px-4 py-2.5">Hạn chót</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {actionItems.map((item: any, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="px-4 py-2.5 font-medium text-slate-800">
                              {item.task || item.description || item}
                            </td>
                            <td className="px-4 py-2.5 text-blue-600 font-semibold">
                              {item.assignee || 'Chưa giao'}
                            </td>
                            <td className="px-4 py-2.5 text-slate-500">
                              {item.deadline || item.dueDate || 'Sớm nhất'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-2 border border-amber-200">
                <Sparkles className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800 mb-1">
                Chưa có báo cáo tóm tắt cuộc họp
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
                Nhấn nút bên dưới để AI tự động phân tích bản ghi âm hoặc nội dung cuộc họp và tạo biên bản tóm tắt, quyết định & kế hoạch hành động.
              </p>
              <button
                onClick={handleGenerateSummary}
                disabled={isGeneratingAi}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs"
              >
                {isGeneratingAi ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                <span>Tạo tóm tắt AI cho cuộc họp</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 2: SHARED FILES & ATTACHMENTS */}
      {allFiles.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
            <div className="flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Tài liệu & Tệp đính kèm đã gửi trong cuộc họp ({allFiles.length})
              </h3>
            </div>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {allFiles.map((file, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors"
              >
                <div className="min-w-0 pr-3">
                  <p className="text-xs font-bold text-slate-800 truncate" title={file.name}>
                    {file.name}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Gửi bởi {file.senderName} • {new Date(file.sentAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <a
                  href={file.url}
                  target="_blank"
                  rel="noreferrer"
                  download={file.name}
                  className="p-2 rounded-lg bg-white border border-slate-200 text-blue-600 hover:text-blue-700 hover:bg-slate-100 transition-colors shrink-0 shadow-2xs"
                  title="Tải về tệp"
                >
                  <Download className="w-3.5 h-3.5" />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 3: ATTENDEES TABLE */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Chi tiết người tham gia</h3>
            <p className="text-xs text-slate-500">
              Bảng thống kê điểm danh và thời lượng họp thực tế
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
              <tr>
                <th className="px-4 py-3">Thành viên</th>
                <th className="px-4 py-3">Vai trò</th>
                <th className="px-4 py-3">RSVP</th>
                <th className="px-4 py-3">Trạng thái điểm danh</th>
                <th className="px-4 py-3">Thời gian tham gia</th>
                <th className="px-4 py-3">Thời gian rời</th>
                <th className="px-4 py-3 text-right">Thời lượng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {details.map((att) => (
                <tr key={att.userId} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-[11px] uppercase overflow-hidden border border-slate-200">
                        {att.avatar ? (
                          <img
                            src={att.avatar}
                            alt={att.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          att.name.charAt(0)
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800">{att.name}</div>
                        <div className="text-[11px] text-slate-400">{att.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                      {att.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {att.rsvp === 'ACCEPTED' ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Chấp nhận
                      </span>
                    ) : att.rsvp === 'DECLINED' ? (
                      <span className="inline-flex items-center gap-1 text-rose-600 font-medium">
                        <XCircle className="w-3.5 h-3.5" /> Từ chối
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-500 font-medium">
                        <HelpCircle className="w-3.5 h-3.5" /> Chờ phản hồi
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {att.isPresent ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Có mặt
                      </span>
                    ) : att.rsvp === 'DECLINED' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        Từ chối tham gia
                      </span>
                    ) : att.rsvp === 'ACCEPTED' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                        Vắng mặt
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        Chưa tham gia
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {att.joinedAt
                      ? new Date(att.joinedAt).toLocaleTimeString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {att.leftAt
                      ? new Date(att.leftAt).toLocaleTimeString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800">
                    {att.durationMinutes > 0 ? `${att.durationMinutes} phút` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 4: MEETING CHAT HISTORY ACCORDION */}
      {chatMessages.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <button
            onClick={() => setIsChatExpanded(!isChatExpanded)}
            className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-slate-600" />
              <span className="text-sm font-bold text-slate-900">
                Lịch sử trò chuyện trong cuộc họp ({chatMessages.length} tin nhắn)
              </span>
            </div>
            {isChatExpanded ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {isChatExpanded && (
            <div className="px-5 pb-5 pt-2 border-t border-slate-100 max-h-80 overflow-y-auto space-y-3">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <div className="flex items-center justify-between text-slate-500 text-[11px] mb-1">
                    <span className="font-bold text-slate-800">{msg.sender?.name || 'Thành viên'}</span>
                    <span>{new Date(msg.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-slate-700 leading-relaxed">{msg.text}</p>
                  {msg.attachment?.url && (
                    <div className="mt-2 pt-2 border-t border-slate-200/80 flex items-center gap-2 text-[11px] text-blue-600 font-semibold">
                      <Paperclip className="w-3.5 h-3.5" />
                      <a href={msg.attachment.url} target="_blank" rel="noreferrer" className="hover:underline">
                        {msg.attachment.name}
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
