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
import { useTranslation } from 'react-i18next';
import type { MeetingTranscriptChunk } from '../types/meeting.types';

/**
 * Ngôn ngữ nhận diện CỐ ĐỊNH cho toàn bộ cuộc họp.
 *
 * Bug trước đây: `lang` được lấy từ `i18n.language` → mỗi máy một ngôn ngữ
 * (máy để UI là EN sẽ ghi `en-US`, máy UI là VI sẽ ghi `vi-VN`) → cùng một
 * cuộc họp bị ghi lại lộn xộn Anh/Việt. Giờ ép cứng `vi-VN` cho mọi người.
 */
const RECOGNITION_LANG = 'vi-VN';

/** Số từ tối thiểu để coi là một câu hoàn chỉnh và gửi lên server */
const MIN_SENTENCE_WORDS = 8;

/** Thời gian chờ ghép nối thêm mảnh tiếp theo trước khi flush câu (ms) */
const FLUSH_DEBOUNCE_MS = 800;

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
  maxAlternatives?: number;
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
  const { t } = useTranslation();

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
  const currentUserRef = useRef(currentUser);
  const sentenceBufferRef = useRef<string>('');
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const captionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restartAttemptsRef = useRef(0);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noSpeechCountRef = useRef(0);
  const noSpeechWarnedRef = useRef(false);

  // Sync refs — BẮT BUỘC. Trước đây `useRef(state)` được đọc trong `onend`
  // nhưng không có effect đồng bộ → giá trị luôn là giá trị render đầu tiên
  // → `onend` luôn return sớm → recognition không bao giờ tự restart.
  useEffect(() => {
    isTranscribingRef.current = isTranscribing;
  }, [isTranscribing]);

  useEffect(() => {
    audioEnabledRef.current = audioEnabled;
  }, [audioEnabled]);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  // Helper: Chuẩn hóa câu tiếng Việt (viết hoa chữ cái đầu, dấu chấm cuối câu)
  const formatSentence = (text: string) => {
    let clean = text.trim().replace(/\s+/g, ' ');
    if (!clean) return '';
    clean = clean.charAt(0).toUpperCase() + clean.slice(1);
    if (!/[.!?…]$/.test(clean)) clean += '.';
    return clean;
  };

  // Helper: Phát câu hoàn chỉnh lên Socket.IO
  const flushSentenceBuffer = useCallback(() => {
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }

    const raw = sentenceBufferRef.current.trim();
    const user = currentUserRef.current;
    if (!raw || !socket || !user) return;

    const formatted = formatSentence(raw);
    sentenceBufferRef.current = '';

    socket.emit('meeting:transcript-chunk', {
      meetingId,
      speaker: {
        id: user.id,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
      },
      text: formatted,
      timestamp: new Date().toISOString(),
    });
  }, [meetingId, socket]);

  // 2. Khởi tạo và thiết lập Recognition với Exponential Backoff Auto-Restart
  const setupRecognition = useCallback(() => {
    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionClass) return null;

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      // ★ CỐ ĐỊNH tiếng Việt cho mọi người tham gia (trước đây lấy từ i18n → mỗi máy 1 ngôn ngữ)
      recognition.lang = RECOGNITION_LANG;

      recognition.onstart = () => {
        // KHÔNG reset backoff ở đây: Chrome gọi `onstart` rồi lại `onend`
        // liên tục khi không có tiếng → reset sớm sẽ tạo vòng lặp restart.
        // Backoff chỉ được reset khi thực sự nhận được text.
      };

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

        const user = currentUserRef.current;

        // 1. Phản hồi tức thì ngay khi người dùng đang nói (Interim Captions)
        const interimTrimmed = interimTranscript.trim();
        if (interimTrimmed && user) {
          setCurrentCaption({
            speakerName: user.name,
            text: interimTrimmed,
            timestamp: new Date().toISOString(),
          });
        }

        // 2. Gom các mảnh câu (Fragments) vào Bộ đệm thông minh
        const trimmed = finalTranscript.trim();
        if (trimmed) {
          // Thực sự nhận được text → đặt lại backoff về 0
          restartAttemptsRef.current = 0;
          noSpeechCountRef.current = 0;
          noSpeechWarnedRef.current = false;

          sentenceBufferRef.current = (sentenceBufferRef.current + ' ' + trimmed).trim();

          const currentFullText = sentenceBufferRef.current;
          const wordCount = currentFullText.split(/\s+/).length;
          const hasEndingPunctuation = /[.!?…]$/.test(trimmed);
          const hasCommaBreak = /[,;:]$/.test(trimmed) && wordCount >= 6;

          // Nếu câu có dấu ngắt hoặc đã đủ dài (>= MIN_SENTENCE_WORDS) -> phát ngay lập tức
          if (hasEndingPunctuation || hasCommaBreak || wordCount >= MIN_SENTENCE_WORDS) {
            flushSentenceBuffer();
          } else {
            // Chờ FLUSH_DEBOUNCE_MS để ghép từ tiếp theo
            if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
            flushTimerRef.current = setTimeout(() => {
              flushSentenceBuffer();
            }, FLUSH_DEBOUNCE_MS);
          }
        }
      };

      recognition.onerror = (err: SpeechRecognitionErrorEvent) => {
        switch (err.error) {
          case 'not-allowed':
          case 'service-not-allowed':
            toast.error(
              t(
                'meeting_room.stt_permission_denied',
                'Trình duyệt chưa được cấp quyền nhận diện giọng nói (Microphone). Vui lòng cấp quyền trên thanh URL.',
              ),
            );
            break;
          case 'network':
            console.warn('[STT] network error, will restart with backoff');
            break;
          case 'no-speech':
            noSpeechCountRef.current += 1;
            if (noSpeechCountRef.current >= 3 && !noSpeechWarnedRef.current) {
              noSpeechWarnedRef.current = true;
              toast.warning(
                t(
                  'meeting_room.stt_no_speech_hint',
                  'Nhận diện tiếng Việt chưa nhận được giọng nói. Nếu bạn dùng Chrome, hãy vào cài đặt Ngôn ngữ và bật "Tiếng Việt" (Vietnamese) trong Speech services.',
                ),
              );
            }
            break;
          case 'aborted':
            break;
          case 'audio-capture':
            toast.error(t('meeting_room.stt_no_mic', 'Không tìm thấy thiết bị microphone.'));
            break;
          default:
            console.warn('[LiveTranscript] SpeechRecognition error:', err.error);
        }
      };

      // Watchdog Auto-Restart với Exponential Backoff
      recognition.onend = () => {
        if (!isTranscribingRef.current || !audioEnabledRef.current) return;

        const attempt = restartAttemptsRef.current;
        const delay = Math.min(1000 * 2 ** attempt, 10000); // 1s, 2s, 4s, 8s, 10s
        restartAttemptsRef.current = attempt + 1;

        if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
        restartTimerRef.current = setTimeout(() => {
          if (!isTranscribingRef.current || !audioEnabledRef.current) return;
          try {
            recognition.start();
          } catch {
            // Đã chạy
          }
        }, delay);
      };

      return recognition;
    } catch (e) {
      console.error('[LiveTranscript] Setup failed:', e);
      return null;
    }
  }, [flushSentenceBuffer, t]);

  // 3. Quản lý việc bật/tắt recognition theo trạng thái phòng và micro
  // ⚠️ deps CỐ Ý KHÔNG chứa `setupRecognition`/`currentUser`:
  // `currentUser` là object literal mới mỗi render → trước đây effect này
  // restart recognition liên tục (restart storm) → STT lag và mất tiếng.
  useEffect(() => {
    if (!isSpeechSupported) return;

    if (isTranscribing && audioEnabled) {
      if (!recognitionRef.current) {
        recognitionRef.current = setupRecognition();
      }
      try {
        recognitionRef.current?.start();
      } catch (err) {
        if ((err as DOMException)?.name !== 'InvalidStateError') {
          console.warn('[STT] start failed', err);
        }
      }
    } else {
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTranscribing, audioEnabled, isSpeechSupported]);

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
