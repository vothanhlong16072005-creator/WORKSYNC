import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ExportButtonProps {
  fromDate?: string;
  toDate?: string;
  userId?: string;
}

export function ExportButton({ fromDate, toDate, userId }: ExportButtonProps) {
  const { i18n } = useTranslation();
  const isVi = i18n.language.startsWith('vi');
  const [isExporting, setIsExporting] = useState<'excel' | 'pdf' | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const buildUrl = (format: 'excel' | 'pdf') => {
    const params = new URLSearchParams();
    if (fromDate) params.set('fromDate', fromDate);
    if (toDate) params.set('toDate', toDate);
    if (userId) params.set('userId', userId);
    const base = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
    return `${base}/attendance/export/${format}?${params.toString()}`;
  };

  const handleExport = async (format: 'excel' | 'pdf') => {
    setIsExporting(format);
    setIsOpen(false);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildUrl(format), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ext = format === 'excel' ? 'xlsx' : 'pdf';
      a.download = `attendance_${new Date().toISOString().split('T')[0]}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(isVi ? `Đã xuất ${format.toUpperCase()} thành công` : `Exported ${format.toUpperCase()} successfully`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(isVi ? `Lỗi xuất file: ${msg}` : `Export failed: ${msg}`);
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isExporting !== null}
        className="flex items-center gap-1.5 px-3 h-9 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-colors disabled:opacity-50"
      >
        {isExporting ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Download className="w-3.5 h-3.5" />
        )}
        <span>{isVi ? 'Xuất báo cáo' : 'Export'}</span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-1.5 z-40 w-48 bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
            <button
              onClick={() => handleExport('excel')}
              disabled={isExporting === 'excel'}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>{isVi ? 'Xuất Excel (.xlsx)' : 'Export Excel (.xlsx)'}</span>
              {isExporting === 'excel' && <Loader2 className="w-3 h-3 animate-spin ml-auto" />}
            </button>
            <button
              onClick={() => handleExport('pdf')}
              disabled={isExporting === 'pdf'}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-rose-50 hover:text-rose-700 transition-colors border-t border-slate-100 disabled:opacity-50"
            >
              <FileText className="w-4 h-4 text-rose-600" />
              <span>{isVi ? 'Xuất PDF (.pdf)' : 'Export PDF (.pdf)'}</span>
              {isExporting === 'pdf' && <Loader2 className="w-3 h-3 animate-spin ml-auto" />}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
