/**
 * useLiveTranscription Hook — Module M5.1
 * Quản lý vòng đời nhận diện giọng nói Web Speech API (Client-side STT)
 * Đồng bộ thời gian thực qua Socket.IO:
 * - Live Captions
 * - Tự động phục hồi (Auto-restart Watchdog) khi im lặng > 30s
 * - Thread-safe streaming từng câu nói kèm danh tính người nói
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import type { Socket } from 'socket.io-client';
import { toast } from 'sonner';
import type { MeetingTranscriptChunk } from '../types/meeting.types';

// Web Speech API interface declarations
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: ((this: SpeechRecognitionInstance, ev: Event) => any) | null;
  onend: ((this: SpeechRecognitionInstance, ev: Event) => any) | null;
  onerror: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionErrorEvent) => any) | null;
  onresult: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionEvent) => any) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: {
      new (): SpeechRecognitionInstance;
    };
    webkitSpeechRecognition?: {
      new (): SpeechRecognitionInstance;
    };
  }
}

interface UseLiveTranscriptionProps {
  meetingId: string;
  socket: Socket | null;
  currentUser: {
    id: string;
    name: string;
    role?: string;
    avatar?: string | null;
  } | null;
  audioEnabled: boolean;
}

export function useLiveTranscription({
  meetingId,
  socket,
  currentUser,
  audioEnabled,
}: UseLiveTranscriptionProps) {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcripts, setTranscripts] = useState<MeetingTranscriptChunk[]>([]);
  const [currentCaption, setCurrentCaption] = useState<{
    speakerName: string;
    text: string;
    timestamp: string;
  } | null>(null);
  const [isSpeechSupported] = useState(() => {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  });

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const isTranscribingRef = useRef(isTranscribing);
  const audioEnabledRef = useRef(audioEnabled);
  const sentenceBufferRef = useRef<string>('');
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const captionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Helper: Chuẩn hóa câu tiếng Việt (viết hoa chữ cái đầu, dấu chấm cuối câu)
  const formatSentence = (text: string) => {
    let clean = text.trim().replace(/\s+/g, ' ');
    if (!clean) return '';
    clean = clean.charAt(0).toUpperCase() + clean.slice(1);
    if (!/[.!?]$/.test(clean)) clean += '.';
    return clean;
  };

  // Helper: Phát câu hoàn chỉnh lên Socket.IO
  const flushSentenceBuffer = useCallback(() => {
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }

    const raw = sentenceBufferRef.current.trim();
    if (!raw || !socket || !currentUser) return;

    const formatted = formatSentence(raw);
    sentenceBufferRef.current = '';

    socket.emit('meeting:transcript-chunk', {
      meetingId,
      speaker: {
        id: currentUser.id,
        name: currentUser.name,
        role: currentUser.role,
        avatar: currentUser.avatar,
      },
      text: formatted,
      timestamp: new Date().toISOString(),
    });
  }, [meetingId, socket, currentUser]);

  // 2. Khởi tạo và thiết lập Recognition với Watchdog Auto-Restart
  const setupRecognition = useCallback(() => {
    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionClass) return null;

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.lang = 'vi-VN'; // Luôn khóa chuẩn tiếng Việt theo yêu cầu

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const item = event.results[i];
          if (item && item.isFinal) {
            finalTranscript += item[0]?.transcript || '';
          } else if (item) {
            interimTranscript += item[0]?.transcript || '';
          }
        }

        // 1. Phản hồi tức thì ngay khi người dùng đang nói (Interim Captions)
        const interimTrimmed = interimTranscript.trim();
        if (interimTrimmed && currentUser) {
          setCurrentCaption({
            speakerName: currentUser.name,
            text: interimTrimmed,
            timestamp: new Date().toISOString(),
          });
        }

        // 2. Gom các mảnh câu (Fragments) vào Bộ đệm thông minh để tạo thành câu hoàn chỉnh
        const trimmed = finalTranscript.trim();
        if (trimmed) {
          sentenceBufferRef.current = (sentenceBufferRef.current + ' ' + trimmed).trim();

          const currentFullText = sentenceBufferRef.current;
          const wordCount = currentFullText.split(/\s+/).length;
          const hasEndingPunctuation = /[.!?]$/.test(trimmed);

          // Nếu câu có dấu ngắt hoặc đã đủ dài (>= 15 từ) -> phát ngay lập tức
          if (hasEndingPunctuation || wordCount >= 15) {
            flushSentenceBuffer();
          } else {
            // Nếu người nói chỉ ngừng lấy hơi ngắn -> chờ 1.8s để ghép tiếp từ tiếp theo
            if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
            flushTimerRef.current = setTimeout(() => {
              flushSentenceBuffer();
            }, 1800);
          }
        }
      };

      recognition.onerror = (err: SpeechRecognitionErrorEvent) => {
        if (err.error === 'not-allowed' || err.error === 'service-not-allowed') {
          toast.error('Trình duyệt chưa được cấp quyền nhận diện giọng nói (Microphone). Vui lòng cấp quyền trên thanh địa chỉ URL.');
        } else if (err.error !== 'no-speech' && err.error !== 'aborted') {
          console.warn('[LiveTranscript] SpeechRecognition error:', err.error);
        }
      };

      // Watchdog Auto-Restart: Tự động khởi động lại khi Chrome ngắt im lặng 60s
      recognition.onend = () => {
        if (isTranscribingRef.current && audioEnabledRef.current) {
          try {
            recognition.start();
          } catch {
            // Tránh throw nếu đã đang chạy
          }
        }
      };

      return recognition;
    } catch (e) {
      console.error('[LiveTranscript] Setup failed:', e);
      return null;
    }
  }, [meetingId, socket, currentUser]);

  // 3. Quản lý việc bật/tắt recognition theo trạng thái phòng và micro
  useEffect(() => {
    if (!isSpeechSupported) return;

    if (isTranscribing && audioEnabled) {
      if (!recognitionRef.current) {
        recognitionRef.current = setupRecognition();
      }
      try {
        recognitionRef.current?.start();
      } catch {
        // Đã start từ trước
      }
    } else {
      try {
        recognitionRef.current?.stop();
      } catch {
        // Đã stop
      }
    }

    return () => {
      try {
        recognitionRef.current?.stop();
      } catch {}
    };
  }, [isTranscribing, audioEnabled, isSpeechSupported, setupRecognition]);

  // 4. Lắng nghe các sự kiện Socket.IO
  useEffect(() => {
    if (!socket) return;

    // Constraint 4: Đồng bộ trạng thái khi vừa join phòng hoặc F5
    const handleSyncState = (data: {
      isTranscribing: boolean;
      transcripts: MeetingTranscriptChunk[];
    }) => {
      setIsTranscribing(data.isTranscribing);
      if (Array.isArray(data.transcripts)) {
        setTranscripts(data.transcripts);
      }
    };

    // Khi người chủ trì bấm Bắt đầu / Dừng ghi âm
    const handleStatusChanged = (data: { isTranscribing: boolean; startedBy?: string }) => {
      setIsTranscribing(data.isTranscribing);
      if (data.isTranscribing) {
        toast.info(
          `🔴 ${data.startedBy || 'Người chủ trì'} đã bắt đầu ghi biên bản AI và tạo phụ đề tự động.`,
        );
      } else {
        toast.info('⏹️ Đã dừng ghi biên bản AI.');
      }
    };

    // Khi có ai đó vừa nói xong một câu (Live Caption)
    const handleLiveCaption = (chunk: MeetingTranscriptChunk) => {
      setTranscripts((prev) => [...prev, chunk]);
      setCurrentCaption({
        speakerName: chunk.speakerName,
        text: chunk.text,
        timestamp: chunk.timestamp,
      });

      // Tự động ẩn phụ đề sau 4.5 giây im lặng
      if (captionTimerRef.current) clearTimeout(captionTimerRef.current);
      captionTimerRef.current = setTimeout(() => {
        setCurrentCaption(null);
      }, 4500);
    };

    socket.on('meeting:sync-state', handleSyncState);
    socket.on('meeting:transcription-status', handleStatusChanged);
    socket.on('meeting:live-caption', handleLiveCaption);

    return () => {
      socket.off('meeting:sync-state', handleSyncState);
      socket.off('meeting:transcription-status', handleStatusChanged);
      socket.off('meeting:live-caption', handleLiveCaption);
      if (captionTimerRef.current) clearTimeout(captionTimerRef.current);
    };
  }, [socket]);

  // 5. Actions
  const startTranscription = useCallback(() => {
    if (!socket) return;
    socket.emit('meeting:start-transcription', {
      meetingId,
      user: currentUser,
    });
  }, [socket, meetingId, currentUser]);

  const stopTranscription = useCallback(() => {
    if (!socket) return;
    socket.emit('meeting:stop-transcription', { meetingId });
  }, [socket, meetingId]);

  return {
    isTranscribing,
    transcripts,
    currentCaption,
    isSpeechSupported,
    startTranscription,
    stopTranscription,
  };
}
