import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WorkflowTypeBadge } from '../WorkflowTypeBadge';

describe('WorkflowTypeBadge', () => {
  it('renders SCRUM badge correctly', () => {
    render(<WorkflowTypeBadge type="SCRUM" />);
    expect(screen.getByText(/SCRUM \/ SPRINT/i)).toBeInTheDocument();
  });

  it('renders KANBAN badge correctly', () => {
    render(<WorkflowTypeBadge type="KANBAN" />);
    expect(screen.getByText(/KANBAN BOARD/i)).toBeInTheDocument();
  });

  it('renders DAILY badge correctly', () => {
    render(<WorkflowTypeBadge type="DAILY" />);
    expect(screen.getByText(/DAILY FLOW/i)).toBeInTheDocument();
  });

  it('renders SIMPLE badge correctly', () => {
    render(<WorkflowTypeBadge type="SIMPLE" />);
    expect(screen.getByText(/SIMPLE LIST/i)).toBeInTheDocument();
  });
});
