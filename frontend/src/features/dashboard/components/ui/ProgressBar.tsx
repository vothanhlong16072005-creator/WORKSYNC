interface ProgressBarProps {
  value: number; // 0-100
  color?: string;
  label?: string;
  showPercent?: boolean;
  height?: 'sm' | 'md' | 'lg';
}

export function ProgressBar({
  value,
  color = '#2563EB',
  label,
  showPercent = true,
  height = 'md',
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  const heights = { sm: 'h-2', md: 'h-3.5', lg: 'h-5' };

  return (
    <div className="w-full">
      {(label || showPercent) && (
        <div className="flex justify-between items-center mb-1.5">
          {label && <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">{label}</span>}
          {showPercent && <span className="text-xs font-black text-slate-900">{clamped}%</span>}
        </div>
      )}
      <div className={`w-full bg-slate-100 border-2 border-slate-900 ${heights[height]} overflow-hidden`}>
        <div
          className="h-full transition-all duration-500 ease-out"
          style={{ width: `${clamped}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
