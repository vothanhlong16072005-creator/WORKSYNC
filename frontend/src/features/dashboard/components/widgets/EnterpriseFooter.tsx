import { ShieldCheck, Server, Globe, Cpu, Terminal } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function EnterpriseFooter() {
  const { t } = useTranslation();

  return (
    <footer className="mt-12 pt-10 pb-8 border-t border-slate-200/90 text-slate-500 text-xs">
      {/* Upper Tier: 4 Comprehensive Enterprise Columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 pb-10 border-b border-slate-200/70">
        {/* Col 1: Brand & Enterprise Security Assurance */}
        <div className="space-y-3.5">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-md bg-blue-600 inline-block" />
            <span className="text-sm font-black text-slate-900 tracking-tight">
              WorkSync Enterprise
            </span>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed font-medium">
            {t(
              'dashboard.footer_desc',
              'Nền tảng quản trị công việc, tiến độ sprint và nhân sự thế hệ mới dành cho doanh nghiệp công nghệ cao.',
            )}
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-bold text-slate-700 border border-slate-200">
              <ShieldCheck className="w-3 h-3 text-blue-600" />
              <span>ISO 27001</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-bold text-slate-700 border border-slate-200">
              <Server className="w-3 h-3 text-emerald-600" />
              <span>SOC2 Type II</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-bold text-slate-700 border border-slate-200">
              <Globe className="w-3 h-3 text-amber-600" />
              <span>GDPR Ready</span>
            </span>
          </div>
        </div>

        {/* Col 2: Core Platform Modules */}
        <div className="space-y-3">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
            {t('dashboard.footer_col_modules', 'Phân hệ & Công cụ')}
          </h4>
          <ul className="space-y-2 text-xs font-medium text-slate-600">
            <li>
              <a href="/dashboard" className="hover:text-blue-600 transition-colors">
                • {t('dashboard.footer_link_dashboard', 'Bảng điều khiển (Executive Dashboard)')}
              </a>
            </li>
            <li>
              <a href="/tasks" className="hover:text-blue-600 transition-colors">
                • {t('dashboard.footer_link_tasks', 'Quản lý công việc (Kanban & Sprint)')}
              </a>
            </li>
            <li>
              <span className="text-slate-400">
                • {t('dashboard.footer_link_attendance', 'Điểm danh Geofence GPS & IP (M2)')}
              </span>
            </li>
            <li>
              <span className="text-slate-400">
                • {t('dashboard.footer_link_meetings', 'Họp trực tuyến WebRTC & Biên bản')}
              </span>
            </li>
            <li>
              <span className="text-slate-400">
                • {t('dashboard.footer_link_docs', 'Kho tài liệu & Quy chuẩn kỹ thuật')}
              </span>
            </li>
          </ul>
        </div>

        {/* Col 3: Workplace & Infrastructure */}
        <div className="space-y-3">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
            {t('dashboard.footer_col_workspace', 'Hạ tầng & Không gian')}
          </h4>
          <div className="space-y-2 text-xs text-slate-600 font-medium leading-relaxed">
            <div>
              <span className="font-bold text-slate-800">Workspace:</span> FPT Software
            </div>
            <div>
              <span className="font-bold text-slate-800">Trụ sở:</span> FPT Complex, Nam Kỳ Khởi Nghĩa, Ngũ Hành Sơn, Đà Nẵng
            </div>
            <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-500">
              <Cpu className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>Cluster: Da Nang DC-01 (Ping: 4ms)</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <Terminal className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Uptime cam kết: 99.98% SLA</span>
            </div>
          </div>
        </div>

        {/* Col 4: Compliance & Support */}
        <div className="space-y-3">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
            {t('dashboard.footer_col_security', 'Bảo mật & Quyền riêng tư')}
          </h4>
          <ul className="space-y-2 text-xs font-medium text-slate-600">
            <li>
              <span className="hover:text-blue-600 transition-colors cursor-pointer">
                • {t('dashboard.footer_rbac', 'Phân quyền kiểm soát RBAC & IDOR')}
              </span>
            </li>
            <li>
              <span className="hover:text-blue-600 transition-colors cursor-pointer">
                • {t('dashboard.footer_privacy', 'Chính sách bảo mật dữ liệu nhân sự')}
              </span>
            </li>
            <li>
              <span className="hover:text-blue-600 transition-colors cursor-pointer">
                • {t('dashboard.footer_terms', 'Quy tắc sử dụng hệ thống nội bộ')}
              </span>
            </li>
            <li>
              <span className="hover:text-blue-600 transition-colors cursor-pointer">
                • {t('dashboard.footer_audit', 'Nhật ký kiểm toán hệ thống (Audit Logs)')}
              </span>
            </li>
          </ul>
        </div>
      </div>

      {/* Lower Tier: System Health, Keyboard Shortcuts, Bauhaus Accents & Copyright */}
      <div className="pt-6 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs font-medium">
        {/* Left: Operational status and Bauhaus geometric watermark */}
        <div className="flex items-center gap-3">
          {/* Subtle Bauhaus geometric accent */}
          <div className="flex items-center gap-1 opacity-80 shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
            <span className="w-2.5 h-2.5 bg-amber-500" />
            <span className="w-2.5 h-2.5 bg-red-600 transform rotate-45" />
          </div>

          <div className="flex items-center gap-1.5 text-slate-800 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{t('dashboard.all_systems_operational', 'All systems operational')}</span>
          </div>

          <span className="text-slate-300">|</span>
          <span className="text-[11px] text-slate-400 font-mono">
            WorkSync Engine v3.1-prod
          </span>
        </div>

        {/* Right: Keyboard shortcuts & Copyright */}
        <div className="flex flex-wrap items-center gap-4 text-[11px]">
          <div className="flex items-center gap-1.5 text-slate-500">
            <span>{t('dashboard.shortcuts_label', 'Phím tắt:')}</span>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 font-mono text-[10px] text-slate-700">Ctrl</kbd>
            <span>+</span>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 font-mono text-[10px] text-slate-700">Alt</kbd>
            <span>+</span>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 font-mono text-[10px] text-slate-700">E</kbd>
          </div>

          <span className="text-slate-400">
            © 2026 WorkSync Enterprise Platform • All rights reserved.
          </span>
        </div>
      </div>
    </footer>
  );
}
