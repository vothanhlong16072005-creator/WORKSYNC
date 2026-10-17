import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import { EditorToolbar } from './EditorToolbar';

interface TiptapEditorProps {
  content: unknown;
  onChange?: (jsonContent: unknown, plainText: string) => void;
  editable?: boolean;
  placeholder?: string;
  className?: string;
}

export const TiptapEditor: React.FC<TiptapEditorProps> = ({
  content,
  onChange,
  editable = true,
  placeholder = 'Bắt đầu soạn thảo nội dung tài liệu...',
  className = '',
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline font-medium hover:text-blue-800',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'rounded-xl max-w-full my-4 border border-slate-200 shadow-sm',
        },
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'border-collapse table-auto w-full my-4 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden',
        },
      }),
      TableRow,
      TableHeader.configure({
        HTMLAttributes: {
          class: 'border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 p-2 font-semibold text-left',
        },
      }),
      TableCell.configure({
        HTMLAttributes: {
          class: 'border border-slate-200 dark:border-slate-700 p-2 text-sm',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content: (content as any) || '',
    editable,
    onUpdate: ({ editor: currentEditor }) => {
      if (onChange) {
        onChange(currentEditor.getJSON(), currentEditor.getText());
      }
    },
  });

  // Sync external content changes if editor already exists
  useEffect(() => {
    if (editor && content) {
      const isSame = JSON.stringify(editor.getJSON()) === JSON.stringify(content);
      if (!isSame) {
        editor.commands.setContent((content as any) || '', { emitUpdate: false });
      }
    }
  }, [content, editor]);

  useEffect(() => {
    if (editor) {
      editor.setEditable(editable);
    }
  }, [editable, editor]);

  return (
    <div className={`flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all ${className}`}>
      {editable && <EditorToolbar editor={editor} />}
      <div className="p-4 sm:p-6 min-h-[350px] cursor-text">
        <EditorContent
          editor={editor}
          className="prose dark:prose-invert max-w-none focus:outline-none min-h-[300px] text-slate-800 dark:text-slate-100 leading-relaxed font-sans"
        />
      </div>
    </div>
  );
};
