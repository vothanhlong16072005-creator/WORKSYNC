import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { GlobalSearch } from '../GlobalSearch';
import { apiClient } from '@/lib/api-client';
import { documentApi } from '@/features/documents/api/document.api';

/**
 * Regression test cho ô tìm kiếm toàn cục trên Header.
 *
 * Bug gốc: ô search ở Header chỉ là UI tĩnh (không có `value`/`onChange`,
 * không gọi API) → gõ vào không ra kết quả.
 */

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: { language: 'vi' },
    t: (k: string, d?: string) => d ?? k,
  }),
}));

vi.mock('@/lib/api-client', () => ({
  apiClient: { get: vi.fn() },
}));

vi.mock('@/features/documents/api/document.api', () => ({
  documentApi: { searchDocuments: vi.fn() },
}));

const mockApiGet = vi.mocked(apiClient.get);
const mockSearchDocs = vi.mocked(documentApi.searchDocuments);

describe('GlobalSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiGet.mockResolvedValue({
      data: [
        {
          id: 'task-1',
          title: 'Báo cáo tuần',
          status: 'TODO',
          priority: 'HIGH',
          project: { id: 'p1', name: 'Dự án A' },
        },
      ],
    });
    mockSearchDocs.mockResolvedValue([
      {
        id: 'doc-1',
        title: 'Quy chế làm việc',
        snippet: '...',
        tags: [],
        owner: { id: 'u1', name: 'Long' },
        type: 'POLICY',
        scope: 'COMPANY',
        currentVersion: 1,
        viewCount: 0,
        updatedAt: '2026-10-24T00:00:00.000Z',
        attachmentsCount: 0,
        versionsCount: 1,
      },
    ]);
  });

  const renderSearch = () =>
    render(
      <MemoryRouter>
        <GlobalSearch />
      </MemoryRouter>,
    );

  it('render ô tìm kiếm với placeholder đúng', () => {
    renderSearch();
    expect(screen.getByPlaceholderText(/TÌM KIẾM CÔNG VIỆC, TÀI LIỆU/i)).toBeTruthy();
  });

  it('gọi API khi nhập từ khóa >= 2 ký tự', async () => {
    const { container } = renderSearch();
    const input = container.querySelector('input[type="search"]') as HTMLInputElement;

    const { fireEvent } = await import('@testing-library/react');
    fireEvent.change(input, { target: { value: 'báo cáo' } });

    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalledWith('/tasks', {
        params: { scope: 'mine', q: 'báo cáo' },
      });
    });
    expect(mockSearchDocs).toHaveBeenCalledWith({ q: 'báo cáo', limit: 5 });
  });

  it('không gọi API khi từ khóa < 2 ký tự', async () => {
    const { container } = renderSearch();
    const input = container.querySelector('input[type="search"]') as HTMLInputElement;

    const { fireEvent } = await import('@testing-library/react');
    fireEvent.change(input, { target: { value: 'a' } });

    await new Promise((r) => setTimeout(r, 400));
    expect(mockApiGet).not.toHaveBeenCalled();
  });

  it('hiển thị kết quả công việc và tài liệu sau khi tìm', async () => {
    const { container } = renderSearch();
    const input = container.querySelector('input[type="search"]') as HTMLInputElement;

    const { fireEvent } = await import('@testing-library/react');
    fireEvent.change(input, { target: { value: 'báo cáo' } });

    await waitFor(() => {
      expect(screen.getByText('Báo cáo tuần')).toBeTruthy();
    });
    expect(screen.getByText('Quy chế làm việc')).toBeTruthy();
  });
});
