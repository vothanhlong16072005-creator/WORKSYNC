import React from 'react';

interface AiFormattedContentProps {
  content: string;
  className?: string;
}

/**
 * AiFormattedContent — Renders markdown/plain AI summaries as an elegant,
 * Word/document-style rich text layout with bold headers, badge accents, and styled list items.
 */
export const AiFormattedContent: React.FC<AiFormattedContentProps> = ({ content, className = '' }) => {
  if (!content) return null;

  // Split content by lines to identify sections, bullets, and paragraphs
  const rawLines = content.split('\n');
  const blocks: Array<{
    type: 'header' | 'bullet' | 'paragraph';
    text: string;
  }> = [];

  for (const rawLine of rawLines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    // Bullet point: starts with -, *, or number like 1.
    if (/^[-*•]\s+/.test(trimmed) || /^\d+\.\s+/.test(trimmed)) {
      const cleanBullet = trimmed.replace(/^[-*•\d.]+\s+/, '');
      blocks.push({ type: 'bullet', text: cleanBullet });
    }
    // Section header: starts with # or wrapped in **...:** or ends with :
    else if (
      /^#{1,4}\s+/.test(trimmed) ||
      (/^\*\*.+\*\*:?$/.test(trimmed) && trimmed.length < 120) ||
      (trimmed.endsWith(':') && trimmed.length < 80 && !trimmed.includes('.'))
    ) {
      const cleanHeader = trimmed.replace(/^#{1,4}\s+/, '').replace(/^\*\*|\*\*$/g, '').replace(/:$/, '');
      blocks.push({ type: 'header', text: cleanHeader });
    } else {
      blocks.push({ type: 'paragraph', text: trimmed });
    }
  }

  /**
   * Helper to parse inline bolding (**text**) into <strong> tags
   */
  const renderInlineFormatted = (text: string) => {
    // Regex matches **bold text**
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const inner = part.slice(2, -2);
        return (
          <strong key={i} className="font-bold text-slate-900 dark:text-white">
            {inner}
          </strong>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className={`space-y-4 text-slate-800 dark:text-slate-200 leading-relaxed font-sans ${className}`}>
      {blocks.map((block, idx) => {
        if (block.type === 'header') {
          return (
            <div key={idx} className="pt-2 first:pt-0">
              <div className="flex items-center gap-2 pb-1 border-b border-slate-200/80 dark:border-slate-700/80">
                <span className="w-1.5 h-4 bg-indigo-600 dark:bg-indigo-400 rounded-full shrink-0" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                  {block.text}
                </h4>
              </div>
            </div>
          );
        }

        if (block.type === 'bullet') {
          return (
            <div key={idx} className="flex items-start gap-2.5 pl-2 text-xs md:text-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500 mt-2 shrink-0" />
              <div className="flex-1 text-slate-700 dark:text-slate-300 leading-normal">
                {renderInlineFormatted(block.text)}
              </div>
            </div>
          );
        }

        return (
          <p key={idx} className="text-xs md:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            {renderInlineFormatted(block.text)}
          </p>
        );
      })}
    </div>
  );
};
