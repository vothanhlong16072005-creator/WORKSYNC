import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useLiveTranscription } from '../useLiveTranscription';

interface MockRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  onstart: (() => void) | null;
  onresult: ((event: unknown) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}

type SocketHandler = (payload: unknown) => void;

describe('useLiveTranscription — vi-VN enforcement & restart storm fix (Phase 1)', () => {
  let instances: MockRecognition[];
  let originalSpeechRecognition: unknown;
  let socketHandlers: Map<string, SocketHandler>;
  let mockSocket: {
    emit: ReturnType<typeof vi.fn>;
    on: (event: string, handler: SocketHandler) => void;
    off: (event: string, handler: SocketHandler) => void;
  };

  beforeEach(() => {
    instances = [];
    socketHandlers = new Map();

    originalSpeechRecognition = (globalThis as unknown as { webkitSpeechRecognition?: unknown })
      .webkitSpeechRecognition;

    class MockSpeechRecognition {
      lang = '';
      continuous = false;
      interimResults = false;
      maxAlternatives = 0;
      start = vi.fn();
      stop = vi.fn();
      onstart: (() => void) | null = null;
      onresult: ((event: unknown) => void) | null = null;
      onerror: ((event: { error: string }) => void) | null = null;
      onend: (() => void) | null = null;
      constructor() {
        instances.push(this as unknown as MockRecognition);
      }
    }

    (globalThis as unknown as { webkitSpeechRecognition: unknown }).webkitSpeechRecognition =
      MockSpeechRecognition;

    mockSocket = {
      emit: vi.fn(),
      on: (event: string, handler: SocketHandler) => {
        socketHandlers.set(event, handler);
      },
      off: (event: string) => {
        socketHandlers.delete(event);
      },
    };
  });

  afterEach(() => {
    (globalThis as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition =
      originalSpeechRecognition;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const makeEvent = (text: string, isFinal: boolean) => ({
    resultIndex: 0,
    results: [
      {
        isFinal,
        0: { transcript: text },
        length: 1,
      },
    ],
  });

  /** Bật chế độ ghi âm (giống server báo qua `meeting:transcription-status`) */
  const enableTranscription = () =>
    act(() => {
      socketHandlers.get('meeting:transcription-status')?.({ isTranscribing: true });
    });

  const renderTranscription = (
    currentUser: { id: string; name: string; role: string } = {
      id: 'u1',
      name: 'Nguyễn Văn A',
      role: 'DEV',
    },
  ) =>
    renderHook(
      (props: { currentUser: { id: string; name: string; role: string } }) =>
        useLiveTranscription({
          meetingId: 'meet-1',
          socket: mockSocket,
          currentUser: props.currentUser,
          audioEnabled: true,
        }),
      { initialProps: { currentUser } },
    );

  it('should always set recognition.lang to vi-VN regardless of UI language', async () => {
    const { result } = renderTranscription();

    await enableTranscription();

    expect(instances.length).toBeGreaterThan(0);
    for (const instance of instances) {
      expect(instance.lang).toBe('vi-VN');
    }
  });

  it('should NOT recreate recognition when currentUser object identity changes', async () => {
    const { result, rerender } = renderTranscription();

    await enableTranscription();

    const countAfterStart = instances.length;
    expect(countAfterStart).toBeGreaterThan(0);

    // currentUser là object literal MỚI mỗi render (giống PersistentCallManager)
    rerender({ currentUser: { id: 'u1', name: 'Nguyễn Văn A', role: 'DEV' } });

    expect(instances.length).toBe(countAfterStart);
  });

  it('should NOT auto-restart recognition after it ends when transcription is disabled', async () => {
    vi.useFakeTimers();
    const { result } = renderTranscription();

    await enableTranscription();

    const instance = instances[instances.length - 1]!;
    const startCallsBefore = instance.start.mock.calls.length;

    // Tắt ghi âm
    await act(async () => {
      result.current.stopTranscription();
      socketHandlers.get('meeting:transcription-status')?.({ isTranscribing: false });
    });

    // onend được gọi khi recognition tự dừng
    act(() => {
      instance.onend?.();
    });

    act(() => {
      vi.advanceTimersByTime(15000);
    });

    expect(instance.start.mock.calls.length).toBe(startCallsBefore);
  });

  it('should restart recognition with backoff when it ends while transcription is active', async () => {
    vi.useFakeTimers();
    const { result } = renderTranscription();

    await enableTranscription();

    const instance = instances[instances.length - 1]!;
    const startCallsBefore = instance.start.mock.calls.length;

    act(() => {
      instance.onend?.();
    });

    act(() => {
      vi.advanceTimersByTime(1100);
    });

    expect(instance.start.mock.calls.length).toBeGreaterThan(startCallsBefore);
  });

  it('should reset backoff only when actual text is received (not on start)', async () => {
    vi.useFakeTimers();
    const { result } = renderTranscription();

    await enableTranscription();

    const instance = instances[instances.length - 1]!;

    // onstart không được reset backoff
    act(() => {
      instance.onstart?.();
    });

    // Nhận text → reset backoff
    act(() => {
      instance.onresult?.(makeEvent('Xin chào các bạn, hôm nay chúng ta họp', true));
    });

    act(() => {
      instance.onend?.();
    });

    // Backoff đã reset → delay 1s (không phải 2s, 4s...)
    const startCallsBefore = instance.start.mock.calls.length;
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(instance.start.mock.calls.length).toBe(startCallsBefore);

    act(() => {
      vi.advanceTimersByTime(1100);
    });
    expect(instance.start.mock.calls.length).toBeGreaterThan(startCallsBefore);
  });

  it('should flush sentence buffer faster (800ms) instead of 1500ms', async () => {
    vi.useFakeTimers();
    const { result } = renderTranscription();

    await enableTranscription();

    const instance = instances[instances.length - 1]!;

    // Câu ngắn (< 8 từ) → chờ debounce
    act(() => {
      instance.onresult?.(makeEvent('Xin chào', true));
    });

    const emitCallsBefore = mockSocket.emit.mock.calls.length;

    act(() => {
      vi.advanceTimersByTime(900);
    });

    // Đã flush sau 900ms (trước đây phải chờ 1500ms)
    expect(mockSocket.emit.mock.calls.length).toBeGreaterThan(emitCallsBefore);
    const transcriptEmit = mockSocket.emit.mock.calls.find(
      (call) => call[0] === 'meeting:transcript-chunk',
    );
    expect(transcriptEmit).toBeDefined();
  });
});
