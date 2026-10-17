import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SprintStatusBadge } from '../SprintStatusBadge';

describe('SprintStatusBadge', () => {
  it('renders ACTIVE badge with pulsing animation indicator', () => {
    render(<SprintStatusBadge status="ACTIVE" />);
    expect(screen.getByText(/ĐANG CHẠY/i)).toBeInTheDocument();
  });

  it('renders PLANNING badge', () => {
    render(<SprintStatusBadge status="PLANNING" />);
    expect(screen.getByText(/LẬP KẾ HOẠCH/i)).toBeInTheDocument();
  });

  it('renders COMPLETED badge', () => {
    render(<SprintStatusBadge status="COMPLETED" />);
    expect(screen.getByText(/ĐÃ HOÀN THÀNH/i)).toBeInTheDocument();
  });
});
