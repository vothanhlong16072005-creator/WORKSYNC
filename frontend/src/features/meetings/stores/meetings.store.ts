/**
 * Meetings Zustand Store — Module M5
 * Reference: PLAN-2026-10-17-M5-MEETINGS-V2.md
 */
import { create } from 'zustand';
import { meetingApi } from '../api/meeting.api';
import type {
  CreateMeetingInput,
  Meeting,
  MeetingScope,
  MeetingStatus,
  UpdateMeetingInput,
} from '../types/meeting.types';

interface MeetingsState {
  meetings: Meeting[];
  activeMeeting: Meeting | null;
  loading: boolean;
  error: string | null;
  filterScope: MeetingScope | 'ALL';
  filterTab: 'upcoming' | 'ongoing' | 'past';

  setFilterScope: (scope: MeetingScope | 'ALL') => void;
  setFilterTab: (tab: 'upcoming' | 'ongoing' | 'past') => void;

  loadMeetings: (params?: { scope?: MeetingScope; status?: MeetingStatus }) => Promise<void>;
  loadMeetingById: (id: string) => Promise<Meeting | null>;
  createMeeting: (data: CreateMeetingInput) => Promise<Meeting>;
  updateMeeting: (id: string, data: UpdateMeetingInput) => Promise<Meeting>;
  deleteMeeting: (id: string) => Promise<void>;
  submitRsvp: (id: string, status: 'ACCEPTED' | 'DECLINED') => Promise<void>;
  saveMinutes: (id: string, content: string) => Promise<void>;
}

export const useMeetingsStore = create<MeetingsState>((set, get) => ({
  meetings: [],
  activeMeeting: null,
  loading: false,
  error: null,
  filterScope: 'ALL',
  filterTab: 'upcoming',

  setFilterScope: (filterScope) => set({ filterScope }),
  setFilterTab: (filterTab) => set({ filterTab }),

  loadMeetings: async (params) => {
    set({ loading: true, error: null });
    try {
      const scopeParam =
        get().filterScope !== 'ALL' ? (get().filterScope as MeetingScope) : params?.scope;
      const data = await meetingApi.getAll({
        ...params,
        scope: scopeParam,
      });
      set({ meetings: data, loading: false });
    } catch (err: any) {
      set({
        error: err.response?.data?.message || err.message || 'Lỗi khi tải danh sách cuộc họp',
        loading: false,
      });
    }
  },

  loadMeetingById: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const data = await meetingApi.getById(id);
      set({ activeMeeting: data, loading: false });
      return data;
    } catch (err: any) {
      set({
        error: err.response?.data?.message || err.message || 'Lỗi khi tải thông tin cuộc họp',
        loading: false,
      });
      return null;
    }
  },

  createMeeting: async (data: CreateMeetingInput) => {
    set({ loading: true, error: null });
    try {
      const newMeeting = await meetingApi.create(data);
      set((state) => ({
        meetings: [newMeeting, ...state.meetings],
        loading: false,
      }));
      return newMeeting;
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.message || err.message || 'Lỗi khi tạo cuộc họp';
      set({ error: errorMsg, loading: false });
      throw new Error(errorMsg);
    }
  },

  updateMeeting: async (id: string, data: UpdateMeetingInput) => {
    set({ loading: true, error: null });
    try {
      const updated = await meetingApi.update(id, data);
      set((state) => ({
        meetings: state.meetings.map((m) => (m.id === id ? updated : m)),
        activeMeeting: state.activeMeeting?.id === id ? updated : state.activeMeeting,
        loading: false,
      }));
      return updated;
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.message || err.message || 'Lỗi khi cập nhật cuộc họp';
      set({ error: errorMsg, loading: false });
      throw new Error(errorMsg);
    }
  },

  deleteMeeting: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await meetingApi.delete(id);
      set((state) => ({
        meetings: state.meetings.filter((m) => m.id !== id),
        activeMeeting: state.activeMeeting?.id === id ? null : state.activeMeeting,
        loading: false,
      }));
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.message || err.message || 'Lỗi khi xóa cuộc họp';
      set({ error: errorMsg, loading: false });
      throw new Error(errorMsg);
    }
  },

  submitRsvp: async (id: string, status: 'ACCEPTED' | 'DECLINED') => {
    try {
      const updatedAttendee = await meetingApi.rsvp(id, status);
      set((state) => {
        const updateAttendees = (m: Meeting) =>
          m.id === id
            ? {
                ...m,
                attendees: m.attendees.map((a) =>
                  a.id === updatedAttendee.id ? updatedAttendee : a,
                ),
              }
            : m;

        return {
          meetings: state.meetings.map(updateAttendees),
          activeMeeting: state.activeMeeting ? updateAttendees(state.activeMeeting) : null,
        };
      });
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.message || err.message || 'Lỗi khi cập nhật RSVP';
      set({ error: errorMsg });
      throw new Error(errorMsg);
    }
  },

  saveMinutes: async (id: string, content: string) => {
    try {
      const minute = await meetingApi.saveMinutes(id, content);
      set((state) => {
        const updateMinutes = (m: Meeting) =>
          m.id === id ? { ...m, minutes: minute } : m;
        return {
          meetings: state.meetings.map(updateMinutes),
          activeMeeting: state.activeMeeting ? updateMinutes(state.activeMeeting) : null,
        };
      });
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.message || err.message || 'Lỗi khi lưu biên bản';
      set({ error: errorMsg });
      throw new Error(errorMsg);
    }
  },
}));
