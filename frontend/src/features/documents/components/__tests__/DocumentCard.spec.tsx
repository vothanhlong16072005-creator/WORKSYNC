import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { DocumentCard } from '../DocumentCard';
import type { DocumentItem } from '../../types/document.types';

describe('DocumentCard', () => {
  const baseDoc: DocumentItem = {
    id: 'doc-123',
    title: 'Tài liệu Thiết kế Hệ thống M6',
    content: {},
    contentText: 'Đây là nội dung tóm tắt của tài liệu kiến trúc.',
    scope: 'PROJECT',
    type: 'TASK_REQUIREMENT',
    ownerId: 'user-1',
    owner: { id: 'user-1', name: 'Nguyễn Văn Hùng', avatar: null },
    tags: ['spec', 'architecture'],
    currentVersion: 2,
    viewCount: 15,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    _count: {
      versions: 2,
      attachments: 3,
    },
  };

  it('1. Renders title, badges, author, and snippet', () => {
    render(
      <BrowserRouter>
        <DocumentCard document={baseDoc} />
      </BrowserRouter>,
    );

    expect(screen.getByText('Tài liệu Thiết kế Hệ thống M6')).toBeInTheDocument();
    expect(screen.getByText(/Dự án/i)).toBeInTheDocument();
    expect(screen.getByText(/Yêu cầu \(Spec\)/i)).toBeInTheDocument();
    expect(screen.getByText('Nguyễn Văn Hùng')).toBeInTheDocument();
    expect(screen.getByText(/Đây là nội dung tóm tắt/i)).toBeInTheDocument();
  });

  it('2. Renders company scope badge for COMPANY documents', () => {
    const companyDoc: DocumentItem = {
      ...baseDoc,
      id: 'doc-company',
      scope: 'COMPANY',
      type: 'COMPANY_POLICY',
      title: 'Quy chế công ty 2027',
    };

    render(
      <BrowserRouter>
        <DocumentCard document={companyDoc} />
      </BrowserRouter>,
    );

    expect(screen.getAllByText(/Công ty/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Quy chế/i).length).toBeGreaterThanOrEqual(1);
  });
});
