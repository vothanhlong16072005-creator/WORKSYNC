import { useState, useEffect } from 'react';
import { Timer, Play, Pause, RotateCcw, CheckCircle2, Flame, Sparkles } from 'lucide-react';
import type { UrgentTask } from '../../types/dashboard.types';
import { toast } from 'sonner';

interface Props {
  urgentTasks?: UrgentTask[];
}

export function DeepWorkTrackerWidget({ urgentTasks = [] }: Props) {
  const activeTaskCandidate = urgentTasks.find((t) => t.status === 'IN_PROGRESS') || urgentTasks[0];
  const [selectedTaskId, setSelectedTaskId] = useState<string>(activeTaskCandidate?.id || 'TASK-101');
  const [secondsLeft, setSecondsLeft] = useState<number>(25 * 60); // 25 minutes standard Pomodoro
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [sessionsCompleted, setSessionsCompleted] = useState<number>(2);

  const selectedTask = urgentTasks.find((t) => t.id === selectedTaskId) || {
    id: 'TASK-101',
    title: 'Nghiên cứu & tích hợp thuật toán định vị Geo-fence cho FPT Complex',
    projectName: 'WorkSync Platform',
  };

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isRunning && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft((prev) => prev - 1);
      }, 1000);
    } else if (secondsLeft === 0 && isRunning) {
      setIsRunning(false);
      setSessionsCompleted((prev) => prev + 1);
      toast.success('🎉 Hoàn thành phiên làm việc sâu (Deep Work Session)!', {
        description: `Bạn vừa hoàn tất 25 phút tập trung cao độ trên ${selectedTask.title}`,
      });
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, secondsLeft, selectedTask.title]);

  const toggleTimer = () => {
    setIsRunning(!isRunning);
    if (!isRunning) {
      toast.info('Bắt đầu phiên Deep Work', {
        description: `Tập trung hoàn toàn vào: ${selectedTask.title}`,
      });
    }
  };

  const resetTimer = () => {
    setIsRunning(false);
    setSecondsLeft(25 * 60);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="bg-slate-950 text-white rounded-2xl border border-slate-800 shadow-md p-5 sm:p-6 relative overflow-hidden transition-all hover:border-slate-700">
      {/* Decorative focus ambient aura */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30 shadow-xs">
            <Timer className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400 block">
              Focus Time & Deep Work Tracker
            </span>
            <h2 className="text-sm font-bold text-white tracking-tight">
              Đồng hồ đếm giờ làm việc tập trung
            </h2>
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 text-xs font-semibold text-slate-300 border border-slate-800">
          <Flame className="w-3.5 h-3.5 text-rose-400" />
          <span>{sessionsCompleted} phiên hoàn tất hôm nay</span>
        </div>
      </div>

      {/* Active Task Selector & Info */}
      <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800 mb-4">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="font-bold text-slate-400 uppercase text-[10px] tracking-wider">
            Đang làm việc sâu trên tác vụ:
          </span>
          {urgentTasks.length > 1 && (
            <select
              value={selectedTaskId}
              onChange={(e) => setSelectedTaskId(e.target.value)}
              className="bg-slate-950 text-slate-200 text-xs border border-slate-700 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-rose-500"
            >
              {urgentTasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.id}: {t.title.slice(0, 32)}...
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="font-bold text-sm text-slate-100 flex items-center gap-2 truncate">
          <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded-md text-xs font-mono font-bold shrink-0">
            {selectedTask.id}
          </span>
          <span className="truncate text-slate-200 text-xs sm:text-sm">{selectedTask.title}</span>
        </div>
      </div>

      {/* Timer Display & Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-slate-900/50 rounded-xl border border-slate-800/80">
        <div className="flex items-baseline gap-3">
          <span className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-rose-400">
            {formatTime(secondsLeft)}
          </span>
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
              isRunning
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}
          >
            {isRunning ? '🔥 Đang chạy' : '⏸️ Tạm dừng'}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={toggleTimer}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-xl shadow-xs transition-colors ${
              isRunning
                ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 font-black'
                : 'bg-rose-600 hover:bg-rose-500 text-white'
            }`}
          >
            {isRunning ? (
              <>
                <Pause className="w-4 h-4 fill-slate-950" />
                <span>Tạm dừng</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>Bắt đầu Deep Work</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={resetTimer}
            title="Đặt lại đồng hồ"
            className="p-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors shadow-xs"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bottom Hint & Fast Complete */}
      <div className="flex flex-wrap items-center justify-between gap-2 mt-3 text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-rose-400" />
          <span>Kỹ thuật Pomodoro: 25 phút tập trung + 5 phút nghỉ ngắn</span>
        </span>
        <button
          type="button"
          onClick={() => {
            setSessionsCompleted((prev) => prev + 1);
            toast.success(`Đã đánh dấu hoàn thành 1 chu kỳ Deep Work trên ${selectedTask.id}!`);
          }}
          className="font-bold text-emerald-400 hover:text-emerald-300 hover:underline flex items-center gap-1 transition-colors"
        >
          <CheckCircle2 className="w-4 h-4" />
          Đánh dấu xong phiên
        </button>
      </div>
    </div>
  );
}
