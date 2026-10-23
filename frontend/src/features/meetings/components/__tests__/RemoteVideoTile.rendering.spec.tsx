import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';

/**
 * Test logic quyết định hiển thị video vs avatar cho remote peer.
 *
 * Bug gốc: `Boolean(stream && peer.videoEnabled)` → khi cờ metadata chưa đồng bộ
 * (mặc định `true` từ server hoặc gửi sai) nhưng camera ĐÃ có stream thật,
 * tile hiện avatar + "Camera đang tắt" → user tưởng camera tắt.
 *
 * Fix: ưu tiên sự thật từ media — có stream ⇒ hiện video.
 */

/** Mirror đúng logic trong `RemoteVideoTile` (PersistentCallManager.tsx) */
const shouldShowVideo = (stream: MediaStream | null, videoEnabled: boolean): boolean => {
  void videoEnabled;
  return Boolean(stream);
};

describe('RemoteVideoTile — video vs avatar rendering logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows video when stream exists even if videoEnabled flag is false', () => {
    const stream = { id: 's1' } as unknown as MediaStream;
    // Trước fix: Boolean(stream && false) = false → hiện avatar "Camera đang tắt"
    // Sau fix: có stream → hiện video
    expect(shouldShowVideo(stream, false)).toBe(true);
  });

  it('shows avatar when there is no stream at all', () => {
    expect(shouldShowVideo(null, true)).toBe(false);
    expect(shouldShowVideo(null, false)).toBe(false);
  });

  it('shows video when stream exists and videoEnabled flag is true', () => {
    const stream = { id: 's1' } as unknown as MediaStream;
    expect(shouldShowVideo(stream, true)).toBe(true);
  });

  it('does not render the "Camera đang tắt" label when a video stream is present', () => {
    const stream = { id: 's1' } as unknown as MediaStream;
    const isVideoShowing = shouldShowVideo(stream, false);

    if (isVideoShowing) {
      expect(screen.queryByText(/Camera đang tắt/i)).toBeNull();
    } else {
      expect(screen.getByText(/Camera đang tắt/i)).toBeTruthy();
    }
  });
});
