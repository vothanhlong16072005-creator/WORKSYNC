import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import {
  Server,
  Activity,
  Database,
  Cpu,
  Layers,
  ShieldAlert,
  Settings,
  ArrowRight,
  Zap,
} from 'lucide-react';
import { HeroBanner } from '../widgets/HeroBanner';
import { EnterpriseFooter } from '../widgets/EnterpriseFooter';
import type { AdminDashboardData } from '../../types/dashboard.types';

interface AdminDashboardLayoutProps {
  data: AdminDashboardData;
  userName: string;
}

export function AdminDashboardLayout({ data, userName }: AdminDashboardLayoutProps) {
  const { t } = useTranslation();

  const health = data.platformHealth || {
    activeUsers: data.systemHealth?.activeUsers || 12,
    activeUsersNow: 9,
    apiRequestsToday: 18450,
    errorRateToday: 0.02,
    dbSize: '24.8 MB',
    uptime: '99.98%',
  };

  const gauges = data.systemGauges || {
    cpuUsagePercent: 18,
    memoryUsagePercent: 42,
    dbConnectionsActive: 6,
    dbConnectionsMax: 100,
    storageUsedGb: 1.4,
    storageMaxGb: 50,
  };

  const latency = data.apiLatency || {
    p50: 12,
    p95: 45,
    p99: 115,
  };

  const logs = data.errorLogs || [
    {
      id: 'err-1',
      timestamp: new Date().toISOString(),
      level: 'WARN' as const,
      source: 'GeoValidationService',
      message: 'Tọa độ GPS lệch 512m so với Geofence FPT Complex',
      resolved: true,
    },
    {
      id: 'err-2',
      timestamp: new Date().toISOString(),
      level: 'WARN' as const,
      source: 'IpValidationService',
      message: 'IP ngoại lệ, kích hoạt fallback định vị GPS',
      resolved: true,
    },
  ];

  const config = data.configStatus || {
    officeName: 'FPT Software Complex Đà Nẵng',
    gpsRadiusMeters: 500,
    ipRangesCount: 2,
    workHours: '08:00 - 17:30',
  };

  return (
    <div className="space-y-6">
      {/* 1. Hero Banner with Admin Badge */}
      <HeroBanner userName={userName} />

      {/* 2. Platform & System KPI Ribbon — responsive 2/3/6 columns */}
      <div
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5"
        role="region"
        aria-label="Platform SLA KPI Ribbon"
      >
        {/* Active Users */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-sm border-l-4 border-l-blue-600 transition-all hover:shadow-md" role="article">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {t('dashboard.admin.system_users')}
            </span>
            <Activity className="w-4 h-4 text-blue-600" aria-hidden="true" />
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight" aria-live="polite">
            {health.activeUsers}
          </div>
          <p className="text-[10px] text-blue-600 font-medium mt-1">
            {t('dashboard.admin.online_now', { count: health.activeUsersNow })}
          </p>
        </div>

        {/* API Requests */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-sm border-l-4 border-l-emerald-500 transition-all hover:shadow-md" role="article">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {t('dashboard.admin.api_requests')}
            </span>
            <Zap className="w-4 h-4 text-emerald-600" aria-hidden="true" />
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight" aria-live="polite">
            {health.apiRequestsToday.toLocaleString()}
          </div>
          <p className="text-[10px] text-emerald-600 font-medium mt-1">
            {health.errorRateToday}% error rate
          </p>
        </div>

        {/* Uptime */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-sm border-l-4 border-l-indigo-600 transition-all hover:shadow-md" role="article">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {t('dashboard.admin.uptime_sla')}
            </span>
            <Server className="w-4 h-4 text-indigo-600" aria-hidden="true" />
          </div>
          <div className="text-2xl font-black text-indigo-600 tracking-tight" aria-live="polite">
            {health.uptime}
          </div>
          <p className="text-[10px] text-indigo-600 font-medium mt-1">
            Cluster FPT DC-01
          </p>
        </div>

        {/* Database Size */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-sm border-l-4 border-l-purple-600 transition-all hover:shadow-md" role="article">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {t('dashboard.admin.db_size')}
            </span>
            <Database className="w-4 h-4 text-purple-600" aria-hidden="true" />
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight" aria-live="polite">
            {health.dbSize}
          </div>
          <p className="text-[10px] text-purple-600 font-medium mt-1">
            PostgreSQL 16 (SSD)
          </p>
        </div>

        {/* Total Projects */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-sm border-l-4 border-l-amber-500 transition-all hover:shadow-md" role="article">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {t('dashboard.admin.total_projects')}
            </span>
            <Layers className="w-4 h-4 text-amber-500" aria-hidden="true" />
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight" aria-live="polite">
            {data.systemHealth?.totalProjects || 2}
          </div>
          <p className="text-[10px] text-amber-600 font-medium mt-1">
            Team workspaces
          </p>
        </div>

        {/* Total Tasks */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-sm border-l-4 border-l-[#C95D43] transition-all hover:shadow-md" role="article">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {t('dashboard.admin.total_tasks')}
            </span>
            <Activity className="w-4 h-4 text-[#C95D43]" aria-hidden="true" />
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight" aria-live="polite">
            {data.systemHealth?.totalTasks || 24}
          </div>
          <p className="text-[10px] text-slate-500 font-medium mt-1">
            {data.systemHealth?.completedTasks || 8} completed
          </p>
        </div>
      </div>

      {/* 3. Middle Dual Grid: System Gauges & API Latency vs Security & Error Audit Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column (7 cols): System Gauges + Latency */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Gauges Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 flex flex-col" role="region" aria-label={t('dashboard.admin.infrastructure')}>
            <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100">
              <span className="p-1 rounded-lg text-blue-600 bg-blue-50">
                <Cpu className="w-4 h-4" aria-hidden="true" />
              </span>
              <h3 className="text-sm font-bold text-slate-900">
                {t('dashboard.admin.infrastructure')}
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* CPU */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center justify-between text-xs font-bold mb-2">
                  <span className="text-slate-600">{t('dashboard.admin.cpu_load')}</span>
                  <span className="text-blue-600 font-black">{gauges.cpuUsagePercent}%</span>
                </div>
                <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden" role="progressbar" aria-valuenow={gauges.cpuUsagePercent} aria-valuemin={0} aria-valuemax={100} aria-label={t('dashboard.admin.cpu_load')}>
                  <div
                    className="bg-blue-600 h-full rounded-full transition-all"
                    style={{ width: `${gauges.cpuUsagePercent}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-2 font-medium">8 Cores vCPU • 3.2 GHz</p>
              </div>

              {/* Memory */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center justify-between text-xs font-bold mb-2">
                  <span className="text-slate-600">{t('dashboard.admin.memory_heap')}</span>
                  <span className="text-purple-600 font-black">{gauges.memoryUsagePercent}%</span>
                </div>
                <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden" role="progressbar" aria-valuenow={gauges.memoryUsagePercent} aria-valuemin={0} aria-valuemax={100} aria-label={t('dashboard.admin.memory_heap')}>
                  <div
                    className="bg-purple-600 h-full rounded-full transition-all"
                    style={{ width: `${gauges.memoryUsagePercent}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-2 font-medium">Heap Used / Max Available</p>
              </div>

              {/* DB Connections */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center justify-between text-xs font-bold mb-2">
                  <span className="text-slate-600">{t('dashboard.admin.db_pool')}</span>
                  <span className="text-emerald-600 font-black">
                    {gauges.dbConnectionsActive}/{gauges.dbConnectionsMax}
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden" role="progressbar" aria-valuenow={gauges.dbConnectionsActive} aria-valuemin={0} aria-valuemax={gauges.dbConnectionsMax} aria-label={t('dashboard.admin.db_pool')}>
                  <div
                    className="bg-emerald-600 h-full rounded-full transition-all"
                    style={{ width: `${(gauges.dbConnectionsActive / gauges.dbConnectionsMax) * 100}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-2 font-medium">Pooler PgBouncer Active</p>
              </div>

              {/* Storage */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center justify-between text-xs font-bold mb-2">
                  <span className="text-slate-600">{t('dashboard.admin.storage')}</span>
                  <span className="text-amber-600 font-black">
                    {gauges.storageUsedGb} GB / {gauges.storageMaxGb} GB
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden" role="progressbar" aria-valuenow={gauges.storageUsedGb} aria-valuemin={0} aria-valuemax={gauges.storageMaxGb} aria-label={t('dashboard.admin.storage')}>
                  <div
                    className="bg-amber-500 h-full rounded-full transition-all"
                    style={{ width: `${(gauges.storageUsedGb / gauges.storageMaxGb) * 100}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-2 font-medium">NVMe SSD Storage Array</p>
              </div>
            </div>
          </div>

          {/* API Latency Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 flex flex-col" role="region" aria-label={t('dashboard.admin.latency')}>
            <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100">
              <span className="p-1 rounded-lg text-emerald-600 bg-emerald-50">
                <Zap className="w-4 h-4" aria-hidden="true" />
              </span>
              <h3 className="text-sm font-bold text-slate-900">
                {t('dashboard.admin.latency')}
              </h3>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200 text-center">
                <span className="text-[11px] font-bold text-emerald-800">{t('dashboard.admin.p50')}</span>
                <p className="text-2xl font-black text-emerald-950 mt-1">{latency.p50} ms</p>
                <span className="text-[10px] text-emerald-700 font-medium">Rất nhanh</span>
              </div>
              <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200 text-center">
                <span className="text-[11px] font-bold text-blue-800">{t('dashboard.admin.p95')}</span>
                <p className="text-2xl font-black text-blue-950 mt-1">{latency.p95} ms</p>
                <span className="text-[10px] text-blue-700 font-medium">Đạt chuẩn SLA</span>
              </div>
              <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200 text-center">
                <span className="text-[11px] font-bold text-amber-800">{t('dashboard.admin.p99')}</span>
                <p className="text-2xl font-black text-amber-950 mt-1">{latency.p99} ms</p>
                <span className="text-[10px] text-amber-700 font-medium">Cao điểm tải</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Error Logs & Security Feed */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Security & Error Feed */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 flex flex-col" role="region" aria-label={t('dashboard.admin.error_log')}>
            <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100">
              <span className="p-1 rounded-lg text-rose-600 bg-rose-50">
                <ShieldAlert className="w-4 h-4" aria-hidden="true" />
              </span>
              <h3 className="text-sm font-bold text-slate-900">
                {t('dashboard.admin.error_log')}
              </h3>
            </div>

            <ul className="space-y-3" role="list">
              {logs.map((log) => (
                <li
                  key={log.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    log.level === 'ERROR'
                      ? 'bg-rose-50/50 border-rose-200/80'
                      : 'bg-amber-50/40 border-amber-200/80'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-bold text-slate-900 font-mono">{log.source}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        log.level === 'ERROR'
                          ? 'bg-rose-600 text-white'
                          : 'bg-amber-500 text-white'
                      }`}
                      aria-label={`Level: ${log.level}`}
                    >
                      {log.level}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 leading-snug">{log.message}</p>
                  <div className="flex items-center justify-between mt-2 text-[10px] text-slate-400">
                    <time dateTime={log.timestamp}>{new Date(log.timestamp).toLocaleTimeString('vi-VN')}</time>
                    {log.resolved && (
                      <span className="text-emerald-600 font-semibold">✓ {log.resolved ? 'Handled' : 'Open'}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick System Config Access */}
          <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800">
            <div className="flex items-center gap-2 text-blue-400 mb-3">
              <Settings className="w-5 h-5" aria-hidden="true" />
              <span className="text-xs font-bold uppercase tracking-wider">
                {t('dashboard.admin.config_status')}
              </span>
            </div>
            <h4 className="text-lg font-black tracking-tight mb-2">
              {config.officeName}
            </h4>
            <dl className="space-y-1.5 text-xs text-slate-300 mb-4">
              <div className="flex justify-between gap-2">
                <dt>• Geofence GPS</dt>
                <dd className="text-white font-bold">{config.gpsRadiusMeters}m</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>• {t('dashboard.admin.ip_ranges')}</dt>
                <dd className="text-white font-bold">{config.ipRangesCount}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>• {t('dashboard.admin.work_hours')}</dt>
                <dd className="text-white font-bold">{config.workHours}</dd>
              </div>
            </dl>
            <NavLink
              to="/attendance"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-blue-900/40 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-900"
              aria-label="Manage attendance system settings"
            >
              <span>Manage Attendance Settings</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </NavLink>
          </div>
        </div>
      </div>

      {/* 4. Footer */}
      <EnterpriseFooter />
    </div>
  );
}
