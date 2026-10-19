import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ModalShell } from '../ModalShell';
import { SwapPmModal } from '../SwapPmModal';
import { QuickTaskDetailModal } from '../QuickTaskDetailModal';
import { MemoryRouter } from 'react-router-dom';
import { deptHeadApi } from '../../../api/dept-head.api';

vi.mock('../../../api/dept-head.api', () => ({
  deptHeadApi: {
    swapPm: vi.fn().mockResolvedValue({ id: 'p-1', pmId: 'cand-2' }),
  },
}));

describe('M3.6 ModalShell', () => {
  it('renders title and subtitle correctly when open', () => {
    const handleClose = vi.fn();
    render(
      <ModalShell
        isOpen={true}
        onClose={handleClose}
        title="Test Shell Title"
        subtitle="Test Shell Subtitle"
      >
        <div>Content Inside Shell</div>
      </ModalShell>,
    );

    expect(screen.getByText('Test Shell Title')).toBeInTheDocument();
    expect(screen.getByText('Test Shell Subtitle')).toBeInTheDocument();
    expect(screen.getByText('Content Inside Shell')).toBeInTheDocument();

    const closeBtn = screen.getByLabelText('Đóng');
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('renders nothing when isOpen is false', () => {
    render(
      <ModalShell isOpen={false} onClose={vi.fn()} title="Hidden">
        <div>Hidden Content</div>
      </ModalShell>,
    );

    expect(screen.queryByText('Hidden')).not.toBeInTheDocument();
  });
});

describe('M3.6 SwapPmModal', () => {
  const candidates = [
    { id: 'cand-1', name: 'Nguyễn Văn A', position: 'Developer', role: 'EMPLOYEE', openTasks: 3, avatar: null },
    { id: 'cand-2', name: 'Trần Thị B', position: 'Lead', role: 'EMPLOYEE', openTasks: 1, avatar: null },
  ];

  it('renders candidates and allows selecting new PM and submitting', async () => {
    const handleSuccess = vi.fn();
    const handleClose = vi.fn();

    render(
      <SwapPmModal
        isOpen={true}
        onClose={handleClose}
        onSuccess={handleSuccess}
        projectId="proj-1"
        projectName="WorkSync Pro"
        currentPmName="Nguyễn Văn A"
        currentPmId="cand-1"
        candidates={candidates}
      />,
    );

    // Current PM is filtered out from candidates list
    expect(screen.getByText('Trần Thị B')).toBeInTheDocument();
    expect(screen.getByText('PM Hiện Tại')).toBeInTheDocument();

    // Select candidate 2
    fireEvent.click(screen.getByText('Trần Thị B'));

    // Click confirm button
    const submitBtn = screen.getByText('Xác nhận đổi PM');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(deptHeadApi.swapPm).toHaveBeenCalledWith('proj-1', {
        newPmId: 'cand-2',
        reason: undefined,
      });
      expect(handleSuccess).toHaveBeenCalled();
      expect(handleClose).toHaveBeenCalled();
    });
  });
});

describe('M3.6 QuickTaskDetailModal', () => {
  it('renders quick task details and due date', () => {
    const task = {
      id: 'qt-1',
      title: 'Review PR architecture',
      description: 'Check security and typing',
      status: 'TODO',
      priority: 'HIGH',
      dueDate: '2026-12-31T00:00:00.000Z',
      assignee: { name: 'Long Võ', position: 'Frontend Lead', avatar: null },
      project: { name: 'WorkSync 2.0', color: '#3B82F6' },
    };

    render(
      <MemoryRouter>
        <QuickTaskDetailModal
          isOpen={true}
          onClose={vi.fn()}
          task={task}
        />
      </MemoryRouter>,
    );

    expect(screen.getAllByText('Review PR architecture').length).toBeGreaterThan(0);
    expect(screen.getByText('Check security and typing')).toBeInTheDocument();
    expect(screen.getByText('Long Võ')).toBeInTheDocument();
    expect(screen.getByText(/HIGH/)).toBeInTheDocument();
  });
});
