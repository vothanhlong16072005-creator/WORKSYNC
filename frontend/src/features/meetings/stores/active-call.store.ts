import { create } from 'zustand';
import type { Meeting } from '../types/meeting.types';

interface ActiveCallState {
  activeMeeting: Meeting | null;
  setActiveMeeting: (meeting: Meeting | null) => void;
  clearActiveMeeting: () => void;
}

export const useActiveCallStore = create<ActiveCallState>((set) => ({
  activeMeeting: null,
  setActiveMeeting: (meeting) => set({ activeMeeting: meeting }),
  clearActiveMeeting: () => set({ activeMeeting: null }),
}));
