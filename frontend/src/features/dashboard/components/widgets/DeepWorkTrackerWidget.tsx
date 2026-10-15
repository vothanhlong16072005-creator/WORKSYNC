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
    <div className="p-5 bg-gradient-to-br from-slate-900 to-slate-950 text-white border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] relative overflow-hidden">
      {/* Decorative background aura */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="p-1.5 bg-rose-600 text-white border border-slate-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <Timer className="w-4 h-4" />
          </span>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-400">
              Focus Time & Deep Work Tracker
            </span>
            <h2 className="text-sm font-black uppercase tracking-tight text-white">
              Đồng hồ đếm giờ làm việc tập trung
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 border border-slate-700 text-xs font-mono font-bold text-slate-300">
          <Flame className="w-3.5 h-3.5 text-rose-400" />
          <span>{sessionsCompleted} phiên hoàn tất hôm nay</span>
        </div>
      </div>

      {/* Active Task Selector & Info */}
      <div className="p-3 bg-slate-800/80 border border-slate-700 mb-4">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="font-bold text-slate-400 uppercase text-[10px] tracking-wider">
            Đang làm việc sâu trên tác vụ:
          </span>
          {urgentTasks.length > 1 && (
            <select
              value={selectedTaskId}
              onChange={(e) => setSelectedTaskId(e.target.value)}
              className="bg-slate-900 text-slate-200 text-xs border border-slate-600 px-2 py-0.5 focus:outline-none"
            >
              {urgentTasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.id}: {t.title.slice(0, 30)}...
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="font-black text-sm text-slate-100 flex items-center gap-2 truncate">
          <span className="px-1.5 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[11px] font-mono shrink-0">
            {selectedTask.id}
          </span>
          <span className="truncate">{selectedTask.title}</span>
        </div>
      </div>

      {/* Timer Display & Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-slate-950 border border-slate-800">
        <div className="flex items-baseline gap-3">
          <span className="text-4xl md:text-5xl font-black font-mono tracking-tight text-rose-400">
            {formatTime(secondsLeft)}
          </span>
          <span className="text-xs font-bold text-slate-400 uppercase">
            {isRunning ? '🔥 Đang chạy' : '⏸️ Tạm dừng'}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={toggleTimer}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-black uppercase tracking-wider border-2 border-slate-900 transition-all ${
              isRunning
                ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                : 'bg-rose-600 hover:bg-rose-500 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
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
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 text-[11px] font-medium text-slate-400">
        <span className="flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-rose-400" />
          <span>Kỹ thuật Pomodoro chuẩn: 25 phút tập trung + 5 phút nghỉ</span>
        </span>
        <button
          type="button"
          onClick={() => {
            setSessionsCompleted((prev) => prev + 1);
            toast.success(`Đã đánh dấu hoàn thành 1 chu kỳ Deep Work trên ${selectedTask.id}!`);
          }}
          className="text-xs font-bold text-emerald-400 hover:underline flex items-center gap-1"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          Đánh dấu xong phiên
        </button>
      </div>
    </div>
  );
}
