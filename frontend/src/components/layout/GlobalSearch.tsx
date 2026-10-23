import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Search,
  CheckSquare,
  FileText,
  Loader2,
  CornerDownLeft,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { documentApi } from '@/features/documents/api/document.api';
import type { DocumentSearchResult } from '@/features/documents/types/document.types';

/**
 * Global search — tìm kiếm CÔNG VIỆC + TÀI LIỆU từ ô search trên Header.
 *
 * Trước đây ô search ở Header chỉ là UI (không có onChange/state) → bấm vào
 * gõ không ra kết quả. Ô này hiện dropdown kết quả và điều hướng tới đúng nơi.
 *
 * ⌨️ Hỗ trợ phím tắt: `/` hoặc Ctrl/Cmd+K để mở nhanh.
 */

interface TaskSearchResult {
  id: string;
  title: string;
  status: string;
  priority: string;
  project?: { id: string; name: string } | null;
  assignee?: { id: string; name: string } | null;
}

type ResultKind = 'task' | 'document';

interface UnifiedResult {
  kind: ResultKind;
  id: string;
  title: string;
  subtitle: string;
}

export const GlobalSearch: React.FC = () => {
  const { i18n } = useTranslation();
  const isVi = !i18n.language.startsWith('en');
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [tasks, setTasks] = useState<TaskSearchResult[]>([]);
  const [documents, setDocuments] = useState<DocumentSearchResult[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce để không gọi API mỗi ký tự
  useEffect(() => {
    const keyword = query.trim();
    if (keyword.length < 2) {
      setTasks([]);
      setDocuments([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timer = setTimeout(async () => {
      const [taskRes, docRes] = await Promise.allSettled([
        apiClient.get<TaskSearchResult[]>('/tasks', {
          params: { scope: 'mine', q: keyword },
        }),
        documentApi.searchDocuments({ q: keyword, limit: 5 }),
      ]);

      // `apiClient.get` trả về AxiosResponse → cần `.data`.
      // `documentApi.searchDocuments` đã tự unwrap `.data` sẵn.
      const taskData = taskRes.status === 'fulfilled' ? taskRes.value.data : null;
      const docData = docRes.status === 'fulfilled' ? docRes.value : null;

      setTasks(Array.isArray(taskData) ? taskData : []);
      setDocuments(Array.isArray(docData) ? docData : []);
      setActiveIndex(0);
      setIsLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Phím tắt: "/" hoặc Ctrl/Cmd+K mở ô tìm kiếm
  useEffect(() => {
    const handleShortcut = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable;

      if ((e.key === '/' && !isTyping) || ((e.metaKey || e.ctrlKey) && e.key === 'k')) {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);

  const results = useMemo<UnifiedResult[]>(() => {
    const taskResults: UnifiedResult[] = tasks.map((t) => ({
      kind: 'task' as const,
      id: t.id,
      title: t.title,
      subtitle: t.project?.name ?? (isVi ? 'Công việc của tôi' : 'My tasks'),
    }));
    const docResults: UnifiedResult[] = documents.map((d) => ({
      kind: 'document' as const,
      id: d.id,
      title: d.title,
      subtitle: d.project?.name ?? d.department?.name ?? (isVi ? 'Tài liệu' : 'Document'),
    }));
    return [...taskResults, ...docResults];
  }, [tasks, documents, isVi]);

  const goToResult = (result: UnifiedResult) => {
    setIsOpen(false);
    setQuery('');
    if (result.kind === 'task') {
      navigate(`/tasks?taskId=${result.id}`);
    } else {
      navigate(`/documents/${result.id}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const result = results[activeIndex];
      if (result) {
        goToResult(result);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const showDropdown = isOpen && query.trim().length >= 2;

  return (
    <div ref={containerRef} className="hidden md:block relative w-96 group">
      <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={
          isVi ? 'TÌM KIẾM CÔNG VIỆC, TÀI LIỆU...' : 'SEARCH TASKS, DOCUMENTS...'
        }
        aria-label={isVi ? 'Tìm kiếm công việc, tài liệu' : 'Search tasks, documents'}
        className="w-full h-11 bg-white border-2 border-slate-200 rounded-none pl-10 pr-10 text-xs font-bold tracking-widest placeholder:text-slate-400 focus:border-primary focus:ring-0 focus-visible:ring-0"
      />
      {isLoading && (
        <Loader2 className="absolute right-3.5 top-3.5 h-4 w-4 text-slate-400 animate-spin" />
      )}

      {/* Dropdown kết quả */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] z-50 max-h-96 overflow-y-auto">
          {results.length === 0 && !isLoading ? (
            <div className="px-4 py-6 text-center">
              <p className="text-xs font-bold text-slate-500">
                {isVi ? 'Không tìm thấy kết quả' : 'No results found'}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                {isVi
                  ? 'Thử từ khóa khác (tên công việc, mã task, nhãn)'
                  : 'Try another keyword (task title, id, label)'}
              </p>
            </div>
          ) : (
            <>
              {tasks.length > 0 && (
                <div className="py-1">
                  <p className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 border-b border-slate-100">
                    {isVi ? 'Công việc' : 'Tasks'}
                  </p>
                  {tasks.map((t, i) => (
                    <button
                      key={`task-${t.id}`}
                      type="button"
                      onClick={() => goToResult({ kind: 'task', id: t.id, title: t.title, subtitle: '' })}
                      onMouseEnter={() => setActiveIndex(i)}
                      className={`w-full text-left px-3 py-2 flex items-center gap-2.5 transition-colors ${
                        activeIndex === i ? 'bg-blue-50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <CheckSquare className="h-4 w-4 text-blue-600 shrink-0" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-bold text-slate-800 truncate">
                          {t.title}
                        </span>
                        <span className="block text-[10px] text-slate-500 truncate">
                          {t.project?.name ?? (isVi ? 'Công việc của tôi' : 'My tasks')}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {documents.length > 0 && (
                <div className="py-1 border-t border-slate-100">
                  <p className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 border-b border-slate-100">
                    {isVi ? 'Tài liệu' : 'Documents'}
                  </p>
                  {documents.map((d, i) => (
                    <button
                      key={`doc-${d.id}`}
                      type="button"
                      onClick={() =>
                        goToResult({
                          kind: 'document',
                          id: d.id,
                          title: d.title,
                          subtitle: d.project?.name ?? '',
                        })
                      }
                      onMouseEnter={() => setActiveIndex(tasks.length + i)}
                      className={`w-full text-left px-3 py-2 flex items-center gap-2.5 transition-colors ${
                        activeIndex === tasks.length + i ? 'bg-blue-50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <FileText className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-bold text-slate-800 truncate">
                          {d.title}
                        </span>
                        <span className="block text-[10px] text-slate-500 truncate">
                          {d.project?.name ?? d.department?.name ?? (isVi ? 'Tài liệu' : 'Document')}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              )}

              <div className="px-3 py-1.5 border-t border-slate-100 bg-slate-50 flex items-center gap-1.5 text-[10px] text-slate-400">
                <CornerDownLeft className="h-3 w-3" />
                <span>{isVi ? 'Enter để mở' : 'Enter to open'}</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
