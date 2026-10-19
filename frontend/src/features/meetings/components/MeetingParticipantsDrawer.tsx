import React from 'react';
import { X, Mic, MicOff, Video, VideoOff, Crown, Users, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Meeting } from '../types/meeting.types';

export interface ParticipantItem {
  socketId: string;
  userId: string;
  name: string;
  avatar?: string;
  isMicOn?: boolean;
  isCamOn?: boolean;
}

interface MeetingParticipantsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  meeting: Meeting;
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar?: string;
  isMyMicOn: boolean;
  isMyCamOn: boolean;
  activePeers: ParticipantItem[];
}

export const MeetingParticipantsDrawer: React.FC<MeetingParticipantsDrawerProps> = ({
  isOpen,
  onClose,
  meeting,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  isMyMicOn,
  isMyCamOn,
  activePeers,
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  // Active user IDs currently connected to WebRTC
  const activeUserIds = new Set<string>([
    currentUserId,
    ...activePeers.map((p) => p.userId).filter(Boolean),
  ]);

  // Invited attendees who are not yet connected in room
  const invitedAttendees = (meeting.attendees || []).filter(
    (att) => att.userId && !activeUserIds.has(att.userId),
  );

  const totalInCall = 1 + activePeers.length;

  return (
    <div className="w-80 sm:w-88 h-full bg-white border-l border-slate-200 flex flex-col shadow-xl z-20 animate-in slide-in-from-right duration-200">
      {/* Drawer Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-600" />
          <h3 className="font-semibold text-sm text-slate-800">
            {t('meeting_room.participants', 'Người tham gia')} ({totalInCall})
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          title="Đóng"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Section 1: In the call */}
        <div>
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">
            <span>{t('meeting_room.in_call', 'Trong cuộc họp')} ({totalInCall})</span>
            <span className="text-emerald-600 font-mono text-[10px] font-bold">● Trực tuyến</span>
          </div>

          <div className="space-y-2">
            {/* Self row */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/90">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0 ring-1 ring-blue-200">
                  {currentUserAvatar ? (
                    <img src={currentUserAvatar} alt={currentUserName} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    currentUserName.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-slate-800 truncate max-w-[120px]">
                      {currentUserName}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-sm bg-blue-100 text-blue-700 font-medium">
                      {t('meeting_room.you', 'Bạn')}
                    </span>
                    {meeting.createdById === currentUserId && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-sm bg-amber-100 text-amber-800 font-medium flex items-center gap-0.5">
                        <Crown className="w-2.5 h-2.5" />
                        {t('meeting_room.host', 'Chủ trì')}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-slate-500 shrink-0">
                {isMyMicOn ? (
                  <Mic className="w-3.5 h-3.5 text-slate-600" />
                ) : (
                  <MicOff className="w-3.5 h-3.5 text-rose-500" />
                )}
                {isMyCamOn ? (
                  <Video className="w-3.5 h-3.5 text-slate-600" />
                ) : (
                  <VideoOff className="w-3.5 h-3.5 text-rose-500" />
                )}
              </div>
            </div>

            {/* Remote active peers */}
            {activePeers.map((peer) => {
              const isHost = meeting.createdById === peer.userId;
              return (
                <div
                  key={peer.socketId}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/70 border border-slate-200 hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold shrink-0">
                      {peer.avatar ? (
                        <img src={peer.avatar} alt={peer.name} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        peer.name?.charAt(0).toUpperCase() || 'U'
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-slate-800 truncate max-w-[130px]">
                          {peer.name}
                        </span>
                        {isHost && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded-sm bg-amber-100 text-amber-800 font-medium flex items-center gap-0.5">
                            <Crown className="w-2.5 h-2.5" />
                            {t('meeting_room.host', 'Chủ trì')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-slate-500 shrink-0">
                    {peer.isMicOn !== false ? (
                      <Mic className="w-3.5 h-3.5 text-slate-600" />
                    ) : (
                      <MicOff className="w-3.5 h-3.5 text-rose-500" />
                    )}
                    {peer.isCamOn !== false ? (
                      <Video className="w-3.5 h-3.5 text-slate-600" />
                    ) : (
                      <VideoOff className="w-3.5 h-3.5 text-rose-500" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 2: Invited but not joined yet */}
        {invitedAttendees.length > 0 && (
          <div>
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">
              <span>{t('meeting_room.invited', 'Chưa tham gia')} ({invitedAttendees.length})</span>
              <Clock className="w-3 h-3 text-slate-400" />
            </div>

            <div className="space-y-2">
              {invitedAttendees.map((att) => {
                const u = att.user;
                if (!u) return null;
                return (
                  <div
                    key={att.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/40 border border-slate-200/60 opacity-80"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-medium shrink-0">
                        {u.avatar ? (
                          <img src={u.avatar} alt={u.name} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          u.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-700 truncate">{u.name}</p>
                        <p className="text-[10px] text-slate-400 truncate">{u.email}</p>
                      </div>
                    </div>

                    <span className="text-[10px] font-medium text-slate-500 px-2 py-0.5 rounded-md bg-white border border-slate-200">
                      {att.rsvp === 'ACCEPTED' ? 'Đã nhận lời' : att.rsvp === 'DECLINED' ? 'Đã từ chối' : 'Chờ phản hồi'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
