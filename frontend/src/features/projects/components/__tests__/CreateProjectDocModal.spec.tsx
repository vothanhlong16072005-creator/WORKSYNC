import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CreateProjectDocModal } from '../CreateProjectDocModal';
import { documentApi } from '@/features/documents/api/document.api';

vi.mock('@/features/documents/api/document.api', () => ({
  documentApi: {
    createDocument: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('CreateProjectDocModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <CreateProjectDocModal
        isOpen={false}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        projectId="proj-1"
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders modal when isOpen is true', () => {
    render(
      <CreateProjectDocModal
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        projectId="proj-ai-meeting"
        projectName="AI Meeting & Speech Intelligence"
      />,
    );

    expect(screen.getByText(/AI Meeting & Speech Intelligence/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Ví dụ: Đặc tả kiến trúc WebRTC|e\.g\. System Architecture/i)).toBeInTheDocument();
  });

  it('submits document successfully and calls onSuccess and onClose', async () => {
    const mockOnClose = vi.fn();
    const mockOnSuccess = vi.fn();
    (documentApi.createDocument as any).mockResolvedValue({ id: 'doc-1', title: 'Architecture Spec' });

    render(
      <CreateProjectDocModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        projectId="proj-ai-meeting"
      />,
    );

    const titleInput = screen.getByPlaceholderText(/Ví dụ: Đặc tả kiến trúc WebRTC|e\.g\. System Architecture/i);
    fireEvent.change(titleInput, { target: { value: 'Đặc tả WebRTC Gateway' } });

    const submitBtn = screen.getByRole('button', { name: /Khởi Tạo Tài Liệu|Create Document/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(documentApi.createDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 'proj-ai-meeting',
          title: 'Đặc tả WebRTC Gateway',
          scope: 'PROJECT',
        }),
      );
      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
