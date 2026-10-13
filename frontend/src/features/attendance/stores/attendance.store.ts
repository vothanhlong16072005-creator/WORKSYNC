import { create } from 'zustand';
import { attendanceApi } from '../api/attendance.api';
import { getErrorMessage } from '../utils/error-handler';
import type {
  AttendanceRecord,
  TodayAttendanceResponse,
  LeaveBalance,
  WfhRequest,
  LeaveRequest,
  CheckInPayload,
  CheckOutPayload,
  CreateWfhPayload,
  CreateLeavePayload,
  ReviewRequestPayload,
} from '../types/attendance.types';

interface AttendanceState {
  todayRecord: AttendanceRecord | null;
  todayWfh: WfhRequest | null;
  todayLeave: LeaveRequest | null;
  config: TodayAttendanceResponse['config'];
  leaveBalance: LeaveBalance | null;
  history: AttendanceRecord[];
  myWfh: WfhRequest[];
  myLeaves: LeaveRequest[];
  pendingWfh: WfhRequest[];
  pendingLeaves: LeaveRequest[];
  isLoading: boolean;
  isCheckingIn: boolean;
  isCheckingOut: boolean;
  error: string | null;

  // Actions
  fetchToday: () => Promise<void>;
  checkIn: (payload: CheckInPayload) => Promise<AttendanceRecord>;
  checkOut: (payload: CheckOutPayload) => Promise<AttendanceRecord>;
  fetchHistory: (fromDate?: string, toDate?: string) => Promise<void>;
  fetchLeaveBalance: () => Promise<void>;
  fetchMyRequests: () => Promise<void>;
  createWfh: (payload: CreateWfhPayload) => Promise<void>;
  createLeave: (payload: CreateLeavePayload) => Promise<void>;
  fetchPendingApprovals: () => Promise<void>;
  approveWfh: (id: string) => Promise<void>;
  rejectWfh: (id: string, payload?: ReviewRequestPayload) => Promise<void>;
  approveLeave: (id: string) => Promise<void>;
  rejectLeave: (id: string) => Promise<void>;

  // GD2 actions
  createEarlyLeave: (payload: { date: string; expectedLeaveTime: string; reason: string }) => Promise<void>;
  createOvertime: (payload: { date: string; registeredStart: string; registeredEnd: string; reason: string }) => Promise<void>;
  startBreak: (reason?: string) => Promise<void>;
  endBreak: () => Promise<void>;
}

export const useAttendanceStore = create<AttendanceState>((set, get) => ({
  todayRecord: null,
  todayWfh: null,
  todayLeave: null,
  config: null,
  leaveBalance: null,
  history: [],
  myWfh: [],
  myLeaves: [],
  pendingWfh: [],
  pendingLeaves: [],
  isLoading: false,
  isCheckingIn: false,
  isCheckingOut: false,
  error: null,

  fetchToday: async () => {
    try {
      const data = await attendanceApi.getToday();
      set({
        todayRecord: data.record,
        todayWfh: data.wfhRequest,
        todayLeave: data.leaveRequest,
        config: data.config,
      });
    } catch (err: unknown) {
      console.error('Failed to fetch today attendance:', getErrorMessage(err));
    }
  },

  checkIn: async (payload: CheckInPayload) => {
    set({ isCheckingIn: true, error: null });
    try {
      const record = await attendanceApi.checkIn(payload);
      set({ todayRecord: record, isCheckingIn: false });
      return record;
    } catch (err: unknown) {
      const errorMsg = getErrorMessage(err, 'Lỗi điểm danh');
      set({ isCheckingIn: false, error: errorMsg });
      throw err;
    }
  },

  checkOut: async (payload: CheckOutPayload) => {
    set({ isCheckingOut: true, error: null });
    try {
      const record = await attendanceApi.checkOut(payload);
      set({ todayRecord: record, isCheckingOut: false });
      return record;
    } catch (err: unknown) {
      const errorMsg = getErrorMessage(err, 'Lỗi tan ca');
      set({ isCheckingOut: false, error: errorMsg });
      throw err;
    }
  },

  fetchHistory: async (fromDate?: string, toDate?: string) => {
    set({ isLoading: true });
    try {
      const history = await attendanceApi.getHistory(fromDate, toDate);
      set({ history, isLoading: false });
    } catch (err: unknown) {
      set({ isLoading: false, error: getErrorMessage(err) });
    }
  },

  fetchLeaveBalance: async () => {
    try {
      const balance = await attendanceApi.getLeaveBalance();
      set({ leaveBalance: balance });
    } catch (err: unknown) {
      console.error('Failed to fetch leave balance:', getErrorMessage(err));
    }
  },

  fetchMyRequests: async () => {
    set({ isLoading: true });
    try {
      const { wfh, leaves } = await attendanceApi.getMyRequests();
      set({ myWfh: wfh, myLeaves: leaves, isLoading: false });
    } catch (err: unknown) {
      set({ isLoading: false, error: getErrorMessage(err) });
    }
  },

  createWfh: async (payload: CreateWfhPayload) => {
    await attendanceApi.createWfh(payload);
    await Promise.all([get().fetchMyRequests(), get().fetchToday()]);
  },

  createLeave: async (payload: CreateLeavePayload) => {
    await attendanceApi.createLeave(payload);
    await Promise.all([get().fetchMyRequests(), get().fetchLeaveBalance()]);
  },

  fetchPendingApprovals: async () => {
    set({ isLoading: true });
    try {
      const [wfh, leaves] = await Promise.all([
        attendanceApi.getPendingWfhRequests(),
        attendanceApi.getPendingLeaveRequests(),
      ]);
      set({ pendingWfh: wfh, pendingLeaves: leaves, isLoading: false });
    } catch (err: unknown) {
      set({ isLoading: false, error: getErrorMessage(err) });
    }
  },

  approveWfh: async (id: string) => {
    await attendanceApi.approveWfh(id);
    await get().fetchPendingApprovals();
  },

  rejectWfh: async (id: string, payload?: ReviewRequestPayload) => {
    await attendanceApi.rejectWfh(id, payload);
    await get().fetchPendingApprovals();
  },

  approveLeave: async (id: string) => {
    await attendanceApi.approveLeave(id);
    await get().fetchPendingApprovals();
  },

  rejectLeave: async (id: string) => {
    await attendanceApi.rejectLeave(id);
    await get().fetchPendingApprovals();
  },

  // GD2: Early Leave + Overtime + Break
  createEarlyLeave: async (payload: { date: string; expectedLeaveTime: string; reason: string }) => {
    await attendanceApi.createEarlyLeave(payload);
    await get().fetchMyRequests();
  },

  createOvertime: async (payload: { date: string; registeredStart: string; registeredEnd: string; reason: string }) => {
    await attendanceApi.createOvertime(payload);
    await get().fetchMyRequests();
  },

  startBreak: async (reason?: string) => {
    await attendanceApi.startBreak(reason);
  },

  endBreak: async () => {
    await attendanceApi.endBreak();
  },
}));
