import React from 'react';
import { Mic, Sparkles } from 'lucide-react';

interface LiveCaptionOverlayProps {
  caption: {
    speakerName: string;
    text: string;
    timestamp: string;
  } | null;
  isTranscribing: boolean;
}

export const LiveCaptionOverlay: React.FC<LiveCaptionOverlayProps> = ({
  caption,
  isTranscribing,
}) => {
  if (!caption && !isTranscribing) return null;

  return (
    <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-30 max-w-2xl w-[90%] pointer-events-none transition-all duration-300">
      {caption ? (
        <div className="mx-auto bg-slate-950/85 backdrop-blur-md border border-white/10 rounded-2xl px-5 py-3 shadow-2xl flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="mt-0.5 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0">
            <Mic className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs font-semibold text-blue-400 tracking-wide">
                {caption.speakerName}
              </span>
              <span className="text-[10px] text-slate-400">
                {new Date(caption.timestamp).toLocaleTimeString('vi-VN', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </span>
            </div>
            <p className="text-sm font-medium text-white leading-relaxed tracking-normal">
              {caption.text}
            </p>
          </div>
        </div>
      ) : isTranscribing ? (
        <div className="mx-auto w-fit bg-slate-900/75 backdrop-blur-md border border-red-500/20 rounded-full px-4 py-1.5 shadow-lg flex items-center gap-2 animate-pulse">
          <span className="w-2 h-2 rounded-full bg-red-500"></span>
          <span className="text-xs text-slate-300 font-medium flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Đang lắng nghe & ghi biên bản tự động...
          </span>
        </div>
      ) : null}
    </div>
  );
};
