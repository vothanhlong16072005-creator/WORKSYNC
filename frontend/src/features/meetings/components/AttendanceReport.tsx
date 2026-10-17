import React from 'react';
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
} from 'lucide-react';
import type { AttendanceReportData } from '../types/meeting.types';

interface AttendanceReportProps {
  data: AttendanceReportData;
}

export const AttendanceReport: React.FC<AttendanceReportProps> = ({ data }) => {
  const { meeting, metrics, details } = data;

  const exportCSV = () => {
    const headers = [
      'Họ và tên',
      'Email',
      'Chức vụ',
      'RSVP',
      'Trạng thái',
      'Thời gian tham gia',
      'Thời gian rời',
      'Thời lượng (phút)',
    ];

    const rows = details.map((d) => [
      `"${d.name}"`,
      `"${d.email}"`,
      `"${d.role}"`,
      `"${d.rsvp}"`,
      `"${d.statusLabel}"`,
      d.joinedAt ? `"${new Date(d.joinedAt).toLocaleString('vi-VN')}"` : '""',
      d.leftAt ? `"${new Date(d.leftAt).toLocaleString('vi-VN')}"` : '""',
      d.durationMinutes,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Bao_cao_cuoc_hop_${meeting.title.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* 6 Key Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* 1. Total Invited */}
        <div className="bg-card border border-border p-4 rounded-2xl shadow-xs">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1">
            <Users className="w-4 h-4 text-blue-500" />
            <span>Tổng mời</span>
          </div>
          <div className="text-2xl font-bold text-foreground">{metrics.totalInvited}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Người trong scope</div>
        </div>

        {/* 2. Present */}
        <div className="bg-card border border-emerald-200/80 dark:border-emerald-900/60 p-4 rounded-2xl shadow-xs bg-emerald-50/20 dark:bg-emerald-950/20">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-xs font-semibold mb-1">
            <UserCheck className="w-4 h-4 text-emerald-600" />
            <span>Có mặt</span>
          </div>
          <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
            {metrics.presentCount}
          </div>
          <div className="text-[11px] text-emerald-600/80 mt-0.5">
            {metrics.totalInvited > 0
              ? `${Math.round((metrics.presentCount / metrics.totalInvited) * 100)}% tham dự`
              : '0%'}
          </div>
        </div>

        {/* 3. Absent */}
        <div className="bg-card border border-rose-200/80 dark:border-rose-900/60 p-4 rounded-2xl shadow-xs bg-rose-50/20 dark:bg-rose-950/20">
          <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 text-xs font-semibold mb-1">
            <UserX className="w-4 h-4 text-rose-600" />
            <span>Vắng mặt</span>
          </div>
          <div className="text-2xl font-bold text-rose-700 dark:text-rose-400">
            {metrics.absentCount}
          </div>
          <div className="text-[11px] text-rose-600/80 mt-0.5">Đã RSVP nhưng không vào</div>
        </div>

        {/* 4. Declined */}
        <div className="bg-card border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1">
            <XCircle className="w-4 h-4 text-slate-500" />
            <span>Từ chối</span>
          </div>
          <div className="text-2xl font-bold text-foreground">{metrics.declinedCount}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">RSVP: DECLINED</div>
        </div>

        {/* 5. Pending */}
        <div className="bg-card border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1">
            <HelpCircle className="w-4 h-4 text-amber-500" />
            <span>Chờ phản hồi</span>
          </div>
          <div className="text-2xl font-bold text-foreground">{metrics.pendingCount}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Chưa gửi phản hồi</div>
        </div>

        {/* 6. Avg Duration */}
        <div className="bg-card border border-blue-200/80 dark:border-blue-900/60 p-4 rounded-2xl shadow-xs bg-blue-50/20 dark:bg-blue-950/20">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 text-xs font-semibold mb-1">
            <Clock className="w-4 h-4 text-blue-600" />
            <span>Thời lượng TB</span>
          </div>
          <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
            {metrics.avgDurationMinutes}p
          </div>
          <div className="text-[11px] text-blue-600/80 mt-0.5">
            Tổng: {Math.round(metrics.totalDurationSeconds / 60)} phút
          </div>
        </div>
      </div>

      {/* Action Header for Table */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-foreground">Chi tiết người tham gia</h3>
          <p className="text-xs text-muted-foreground">
            Bảng thống kê điểm danh và thời lượng họp thực tế
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-foreground bg-muted hover:bg-muted/80 rounded-xl transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-primary" />
            <span>Xuất Excel / CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-foreground bg-muted hover:bg-muted/80 rounded-xl transition-colors shadow-xs"
          >
            <Printer className="w-3.5 h-3.5 text-muted-foreground" />
            <span>In báo cáo</span>
          </button>
        </div>
      </div>

      {/* Attendees Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
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
            <tbody className="divide-y divide-border">
              {details.map((att) => (
                <tr key={att.userId} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-[11px] text-foreground uppercase overflow-hidden">
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
                        <div className="font-semibold text-foreground">{att.name}</div>
                        <div className="text-[11px] text-muted-foreground">{att.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-muted text-muted-foreground border border-border">
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
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Có mặt
                      </span>
                    ) : att.rsvp === 'DECLINED' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300">
                        Từ chối tham gia
                      </span>
                    ) : att.rsvp === 'ACCEPTED' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300">
                        Vắng mặt
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300">
                        Chưa tham gia
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {att.joinedAt
                      ? new Date(att.joinedAt).toLocaleTimeString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {att.leftAt
                      ? new Date(att.leftAt).toLocaleTimeString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-foreground">
                    {att.durationMinutes > 0 ? `${att.durationMinutes} phút` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
