import React, { useEffect, useState } from 'react';
import {
  Calendar,
  Filter,
  Plus,
  RefreshCw,
  Video,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/auth.store';
import { CreateMeetingModal } from '../components/CreateMeetingModal';
import { MeetingCard } from '../components/MeetingCard';
import { MeetingDetailModal } from '../components/MeetingDetailModal';
import { MinutesEditor } from '../components/MinutesEditor';
import { useMeetingsStore } from '../stores/meetings.store';
import type { Meeting } from '../types/meeting.types';

export const MeetingsListPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const {
    meetings,
    loading,
    error,
    filterScope,
    filterTab,
    setFilterScope,
    setFilterTab,
    loadMeetings,
  } = useMeetingsStore();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedMeetingForMinutes, setSelectedMeetingForMinutes] = useState<Meeting | null>(null);
  const [selectedMeetingForDetail, setSelectedMeetingForDetail] = useState<Meeting | null>(null);

  useEffect(() => {
    loadMeetings();
  }, [loadMeetings, filterScope]);

  // Filter meetings by tab
  const now = new Date();
  const filteredMeetings = meetings.filter((m) => {
    // Scope filter
    if (filterScope !== 'ALL' && m.scopeType !== filterScope) {
      return false;
    }

    const start = new Date(m.startTime);
    const end = new Date(m.endTime);

    if (filterTab === 'ongoing') {
      return (
        m.status === 'IN_PROGRESS' ||
        (m.status === 'SCHEDULED' && now >= start && now <= end)
      );
    }
    if (filterTab === 'past') {
      return m.status === 'COMPLETED' || m.status === 'CANCELLED' || end < now;
    }
    // 'upcoming'
    return m.status === 'SCHEDULED' && end >= now;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                {t('meetings.page_title', 'Cuộc họp trực tuyến & Biên bản')}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('meetings.page_subtitle', 'Quản lý lịch họp theo Dự án, Phòng ban và Nội bộ với phân quyền tự động')}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadMeetings()}
            disabled={loading}
            className="p-2 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
            title={t('meetings.refresh', 'Làm mới')}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/90 rounded-xl transition-all shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>{t('meetings.create_btn', 'Tạo cuộc họp')}</span>
          </button>
        </div>
      </div>

      {/* Tabs and Scope Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 p-1 bg-muted/60 rounded-xl border border-border w-fit text-xs font-medium">
          <button
            onClick={() => setFilterTab('upcoming')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filterTab === 'upcoming'
                ? 'bg-card text-foreground shadow-xs font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('meetings.tab_upcoming', 'Sắp diễn ra')}
          </button>
          <button
            onClick={() => setFilterTab('ongoing')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              filterTab === 'ongoing'
                ? 'bg-card text-emerald-600 shadow-xs font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {t('meetings.tab_ongoing', 'Đang diễn ra')}
          </button>
          <button
            onClick={() => setFilterTab('past')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filterTab === 'past'
                ? 'bg-card text-foreground shadow-xs font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('meetings.tab_past', 'Đã kết thúc')}
          </button>
        </div>

        {/* Scope Filter Chips */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-muted-foreground flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5" />
            {t('meetings.scope_filter_label', 'Phạm vi')}:
          </span>
          {(['ALL', 'PROJECT', 'DEPARTMENT', 'ONE_ON_ONE'] as const).map((scope) => {
            const label =
              scope === 'ALL'
                ? t('meetings.scope_all', 'Tất cả')
                : scope === 'PROJECT'
                ? t('meetings.scope_project', 'Dự án')
                : scope === 'DEPARTMENT'
                ? t('meetings.scope_department', 'Phòng ban')
                : t('meetings.scope_custom', 'Cuộc họp tự do');

            const active = filterScope === scope;
            return (
              <button
                key={scope}
                onClick={() => setFilterScope(scope)}
                className={`px-2.5 py-1 rounded-lg border transition-all text-xs ${
                  active
                    ? 'bg-primary/10 border-primary text-primary font-semibold'
                    : 'bg-card border-border text-muted-foreground hover:bg-muted'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
          {error}
        </div>
      )}

      {/* Grid of Meeting Cards */}
      {loading && meetings.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-64 rounded-2xl border border-border bg-muted/30 animate-pulse p-5"
            />
          ))}
        </div>
      ) : filteredMeetings.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border border-dashed border-border bg-card/50 flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground mb-3">
            <Calendar className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-sm text-foreground">Không có cuộc họp nào</h3>
          <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4">
            {filterTab === 'upcoming'
              ? 'Hiện tại chưa có cuộc họp nào sắp tới trong phạm vi bạn được mời.'
              : 'Không tìm thấy cuộc họp nào phù hợp với bộ lọc hiện tại.'}
          </p>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/90 rounded-xl transition-all shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Lên lịch cuộc họp ngay</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMeetings.map((meeting) => (
            <MeetingCard
              key={meeting.id}
              meeting={meeting}
              onOpenMinutes={(m) => setSelectedMeetingForMinutes(m)}
              onOpenDetail={(m) => setSelectedMeetingForDetail(m)}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      <CreateMeetingModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />

      {/* Meeting Detail & AI Summary Modal */}
      {selectedMeetingForDetail && (
        <MeetingDetailModal
          meeting={selectedMeetingForDetail}
          isOpen={Boolean(selectedMeetingForDetail)}
          onClose={() => setSelectedMeetingForDetail(null)}
        />
      )}

      {/* Minutes Modal */}
      {selectedMeetingForMinutes && (
        <MinutesEditor
          meeting={selectedMeetingForMinutes}
          isOpen={Boolean(selectedMeetingForMinutes)}
          onClose={() => setSelectedMeetingForMinutes(null)}
          canEdit={
            user?.id === selectedMeetingForMinutes.createdById || user?.role === 'ADMIN'
          }
        />
      )}
    </div>
  );
};
