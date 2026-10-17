import React, { useEffect, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  Bold,
  Heading1,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Save,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { meetingApi } from '../api/meeting.api';
import { useMeetingsStore } from '../stores/meetings.store';
import type { Meeting } from '../types/meeting.types';

interface MinutesEditorProps {
  meeting: Meeting;
  isOpen: boolean;
  onClose: () => void;
  canEdit: boolean;
}

export const MinutesEditor: React.FC<MinutesEditorProps> = ({
  meeting,
  isOpen,
  onClose,
  canEdit,
}) => {
  const { saveMinutes } = useMeetingsStore();
  const [saving, setSaving] = useState(false);
  const [initialContent, setInitialContent] = useState<string>('');

  const editor = useEditor({
    extensions: [StarterKit],
    content: initialContent || '<p>Chưa có biên bản cho cuộc họp này.</p>',
    editable: canEdit,
    editorProps: {
      attributes: {
        class:
          'prose dark:prose-invert max-w-none min-h-[260px] p-4 focus:outline-hidden text-sm leading-relaxed text-foreground',
      },
    },
  });

  useEffect(() => {
    if (!isOpen) return;

    meetingApi
      .getMinutes(meeting.id)
      .then((minute) => {
        const content = minute?.content || '<h2>Biên bản cuộc họp</h2><p>Các nội dung chính đã thảo luận...</p>';
        setInitialContent(content);
        if (editor) {
          editor.commands.setContent(content);
        }
      })
      .catch(() => {});
  }, [isOpen, meeting.id, editor]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!editor) return;
    const html = editor.getHTML();
    setSaving(true);
    try {
      await saveMinutes(meeting.id, html);
      toast.success('Đã lưu biên bản cuộc họp thành công!');
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi lưu biên bản');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              Biên bản cuộc họp: {meeting.title}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {canEdit
                ? 'Bạn có quyền soạn thảo và cập nhật biên bản này.'
                : 'Chế độ chỉ đọc (Chỉ người tạo hoặc Quản trị viên mới được sửa).'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar (Only if editable) */}
        {canEdit && editor && (
          <div className="flex items-center gap-1 p-2 bg-muted/40 border-b border-border flex-wrap text-xs">
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`p-1.5 rounded-md hover:bg-muted transition-colors ${
                editor.isActive('bold') ? 'bg-muted text-primary font-bold' : 'text-foreground'
              }`}
              title="Đậm"
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`p-1.5 rounded-md hover:bg-muted transition-colors ${
                editor.isActive('italic') ? 'bg-muted text-primary' : 'text-foreground'
              }`}
              title="Nghiêng"
            >
              <Italic className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-border mx-1" />
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              className={`p-1.5 rounded-md hover:bg-muted transition-colors ${
                editor.isActive('heading', { level: 1 }) ? 'bg-muted text-primary' : 'text-foreground'
              }`}
              title="Tiêu đề 1"
            >
              <Heading1 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              className={`p-1.5 rounded-md hover:bg-muted transition-colors ${
                editor.isActive('heading', { level: 2 }) ? 'bg-muted text-primary' : 'text-foreground'
              }`}
              title="Tiêu đề 2"
            >
              <Heading2 className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-border mx-1" />
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={`p-1.5 rounded-md hover:bg-muted transition-colors ${
                editor.isActive('bulletList') ? 'bg-muted text-primary' : 'text-foreground'
              }`}
              title="Danh sách dấu đầu dòng"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={`p-1.5 rounded-md hover:bg-muted transition-colors ${
                editor.isActive('orderedList') ? 'bg-muted text-primary' : 'text-foreground'
              }`}
              title="Danh sách số"
            >
              <ListOrdered className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Content area */}
        <div className="flex-1 overflow-y-auto">
          <EditorContent editor={editor} />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-border bg-card">
          <span className="text-xs text-muted-foreground">
            {meeting.minutes?.updatedAt
              ? `Cập nhật lúc: ${new Date(meeting.minutes.updatedAt).toLocaleTimeString('vi-VN')} ${new Date(meeting.minutes.updatedAt).toLocaleDateString('vi-VN')}`
              : 'Chưa có bản lưu'}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors"
            >
              Đóng
            </button>
            {canEdit && (
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/90 rounded-xl transition-colors disabled:opacity-50 shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? 'Đang lưu...' : 'Lưu biên bản'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
