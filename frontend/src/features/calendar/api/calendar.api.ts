import { apiClient } from '@/lib/api-client';
import type {
  ItemKind,
  RescheduleDto,
  RescheduleResult,
  TimelineQueryParams,
  TimelineResponse,
} from '../types/calendar.types';

export const calendarApi = {
  /**
   * Fetch timeline items & conflicts
   */
  async getTimeline(params: TimelineQueryParams): Promise<TimelineResponse> {
    const res = await apiClient.get<TimelineResponse>('/calendar/timeline', {
      params: {
        from: params.from,
        to: params.to,
        scope: params.scope,
        projectId: params.projectId || undefined,
        assigneeId: params.assigneeId || undefined,
        types: params.types && params.types.length > 0 ? params.types.join(',') : undefined,
        status: params.status && params.status.length > 0 ? params.status.join(',') : undefined,
        priority: params.priority && params.priority.length > 0 ? params.priority.join(',') : undefined,
        query: params.query || undefined,
      },
    });
    return res.data;
  },

  /**
   * Reschedule an item via drag-and-drop or modal
   */
  async rescheduleItem(
    kind: ItemKind,
    id: string,
    dto: RescheduleDto,
  ): Promise<RescheduleResult> {
    const res = await apiClient.patch<RescheduleResult>(
      `/calendar/items/${kind}/${id}/reschedule`,
      dto,
    );
    return res.data;
  },

  /**
   * Export timeline as .ics file
   */
  async exportIcs(params: TimelineQueryParams): Promise<Blob> {
    const res = await apiClient.get('/calendar/export', {
      params: {
        from: params.from,
        to: params.to,
        scope: params.scope,
        projectId: params.projectId || undefined,
        assigneeId: params.assigneeId || undefined,
        types: params.types && params.types.length > 0 ? params.types.join(',') : undefined,
        status: params.status && params.status.length > 0 ? params.status.join(',') : undefined,
        priority: params.priority && params.priority.length > 0 ? params.priority.join(',') : undefined,
        query: params.query || undefined,
      },
      responseType: 'blob',
    });
    return res.data;
  },
};
