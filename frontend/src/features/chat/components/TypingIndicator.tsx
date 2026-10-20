import React from 'react';
import { useTranslation } from 'react-i18next';

interface TypingIndicatorProps {
  userName?: string;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ userName }) => {
  const { t } = useTranslation();

  if (!userName) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-1.5 text-xs text-slate-500 animate-in fade-in duration-150">
      <div className="flex items-center gap-1 bg-slate-100 px-2.5 py-1.5 rounded-full border border-slate-200/80">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span className="text-[11px] text-slate-400 font-medium">
        <strong className="text-slate-600 font-semibold">{userName}</strong> {t('chat.is_typing', 'đang soạn tin...')}
      </span>
    </div>
  );
};
