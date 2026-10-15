import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Users2, Search, Building2, Home, Calendar, Clock, CheckCircle2 } from 'lucide-react';

interface ColleaguePresence {
  id: string;
  name: string;
  avatar: string;
  role: string;
  department: string;
  status: 'IN_OFFICE' | 'WFH' | 'LEAVE' | 'EARLY_LEAVE';
  checkInTime?: string;
  location: string;
}

const MOCK_COLLEAGUES: ColleaguePresence[] = [
  {
    id: 'col-1',
    name: 'Võ Thành Long',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    role: 'Tech Lead / Fullstack',
    department: 'Platform Core',
    status: 'IN_OFFICE',
    checkInTime: '08:18',
    location: 'FPT Complex Da Nang',
  },
  {
    id: 'col-2',
    name: 'Trần Thị Mai',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
    role: 'Senior Frontend Engineer',
    department: 'UI/UX Guild',
    status: 'IN_OFFICE',
    checkInTime: '08:24',
    location: 'FPT Complex Da Nang',
  },
  {
    id: 'col-3',
    name: 'Nguyễn Văn An',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
    role: 'Backend Architect',
    department: 'Platform Core',
    status: 'IN_OFFICE',
    checkInTime: '08:15',
    location: 'FPT Complex Da Nang',
  },
  {
    id: 'col-4',
    name: 'Lê Hoàng Đức',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80',
    role: 'DevOps / Cloud Engineer',
    department: 'Infrastructure',
    status: 'WFH',
    checkInTime: '08:29',
    location: 'WFH • Sơn Trà, Đà Nẵng',
  },
  {
    id: 'col-5',
    name: 'Phạm Quỳnh Anh',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=120&auto=format&fit=crop&q=80',
    role: 'Product Designer',
    department: 'UI/UX Guild',
    status: 'WFH',
    checkInTime: '08:35',
    location: 'WFH • Hải Châu, Đà Nẵng',
  },
  {
    id: 'col-6',
    name: 'Đặng Minh Tuấn',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&auto=format&fit=crop&q=80',
    role: 'Mobile Specialist (React Native)',
    department: 'Mobile Core',
    status: 'LEAVE',
    location: 'Nghỉ phép thường niên (AL)',
  },
  {
    id: 'col-7',
    name: 'Hoàng Kim Ngân',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&auto=format&fit=crop&q=80',
    role: 'QA / Automation Engineer',
    department: 'Quality Assurance',
    status: 'EARLY_LEAVE',
    checkInTime: '08:20',
    location: 'Về sớm 16:30 (Đã duyệt)',
  },
  {
    id: 'col-8',
    name: 'Trương Quốc Bảo',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=120&auto=format&fit=crop&q=80',
    role: 'Database Administrator',
    department: 'Infrastructure',
    status: 'IN_OFFICE',
    checkInTime: '08:10',
    location: 'FPT Complex Da Nang',
  },
  {
    id: 'col-9',
    name: 'Vũ Thảo Vy',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&auto=format&fit=crop&q=80',
    role: 'Scrum Master',
    department: 'Project Management',
    status: 'IN_OFFICE',
    checkInTime: '08:27',
    location: 'FPT Complex Da Nang',
  },
  {
    id: 'col-10',
    name: 'Bùi Đức Trọng',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=120&auto=format&fit=crop&q=80',
    role: 'Security Engineer',
    department: 'SecOps',
    status: 'IN_OFFICE',
    checkInTime: '08:05',
    location: 'FPT Complex Da Nang',
  },
  {
    id: 'col-11',
    name: 'Ngô Hải Yến',
    avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=120&auto=format&fit=crop&q=80',
    role: 'HR Specialist',
    department: 'Human Resources',
    status: 'IN_OFFICE',
    checkInTime: '08:12',
    location: 'FPT Complex Da Nang',
  },
  {
    id: 'col-12',
    name: 'Phan Nhật Huy',
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=120&auto=format&fit=crop&q=80',
    role: 'AI / Data Scientist',
    department: 'AI Lab',
    status: 'IN_OFFICE',
    checkInTime: '08:22',
    location: 'FPT Complex Da Nang',
  },
];

type FilterStatus = 'ALL' | 'IN_OFFICE' | 'WFH' | 'LEAVE' | 'EARLY_LEAVE';

export function TeamPresencePulse() {
  const { i18n } = useTranslation();
  const isVi = i18n.language.startsWith('vi');

  const [filter, setFilter] = useState<FilterStatus>('ALL');
  const [search, setSearch] = useState('');

  const counts = useMemo(() => {
    return {
      all: MOCK_COLLEAGUES.length,
      inOffice: MOCK_COLLEAGUES.filter((c) => c.status === 'IN_OFFICE').length,
      wfh: MOCK_COLLEAGUES.filter((c) => c.status === 'WFH').length,
      leave: MOCK_COLLEAGUES.filter((c) => c.status === 'LEAVE').length,
      earlyLeave: MOCK_COLLEAGUES.filter((c) => c.status === 'EARLY_LEAVE').length,
    };
  }, []);

  const filteredColleagues = useMemo(() => {
    return MOCK_COLLEAGUES.filter((col) => {
      const matchStatus = filter === 'ALL' || col.status === filter;
      const matchSearch =
        col.name.toLowerCase().includes(search.toLowerCase()) ||
        col.role.toLowerCase().includes(search.toLowerCase()) ||
        col.department.toLowerCase().includes(search.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [filter, search]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 hover:shadow-md transition-all duration-200 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Users2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-slate-900 tracking-tight">
                {isVi ? 'Đồng nghiệp hôm nay' : "Who's In Today — Team Presence"}
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                {counts.inOffice} {isVi ? 'có mặt tại cty' : 'in office'}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {isVi
                ? 'Theo dõi trạng thái làm việc thực tế của các thành viên trong dự án & phòng ban'
                : 'Real-time workplace presence of team members across departments'}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isVi ? 'Tìm kiếm đồng nghiệp...' : 'Search colleague...'}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/20 bg-slate-50/50"
          />
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setFilter('ALL')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            filter === 'ALL'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
          }`}
        >
          {isVi ? 'Tất cả' : 'All'} ({counts.all})
        </button>
        <button
          onClick={() => setFilter('IN_OFFICE')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            filter === 'IN_OFFICE'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100/80 border border-emerald-200/60'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>{isVi ? 'Tại FPT Complex' : 'In Office'}</span> ({counts.inOffice})
        </button>
        <button
          onClick={() => setFilter('WFH')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            filter === 'WFH'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-blue-50 text-blue-700 hover:bg-blue-100/80 border border-blue-200/60'
          }`}
        >
          <Home className="w-3.5 h-3.5" />
          <span>WFH</span> ({counts.wfh})
        </button>
        <button
          onClick={() => setFilter('LEAVE')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            filter === 'LEAVE'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'bg-amber-50 text-amber-700 hover:bg-amber-100/80 border border-amber-200/60'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>{isVi ? 'Nghỉ phép' : 'On Leave'}</span> ({counts.leave})
        </button>
        <button
          onClick={() => setFilter('EARLY_LEAVE')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            filter === 'EARLY_LEAVE'
              ? 'bg-cyan-600 text-white shadow-sm'
              : 'bg-cyan-50 text-cyan-700 hover:bg-cyan-100/80 border border-cyan-200/60'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>{isVi ? 'Về sớm' : 'Early Leave'}</span> ({counts.earlyLeave})
        </button>
      </div>

      {/* Grid of Colleagues */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
        {filteredColleagues.map((col) => {
          const statusBadge = {
            IN_OFFICE: {
              label: isVi ? 'Tại văn phòng' : 'In Office',
              color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
              dot: 'bg-emerald-500',
            },
            WFH: {
              label: 'WFH',
              color: 'bg-blue-50 text-blue-700 border-blue-200',
              dot: 'bg-blue-500',
            },
            LEAVE: {
              label: isVi ? 'Nghỉ phép' : 'On Leave',
              color: 'bg-amber-50 text-amber-700 border-amber-200',
              dot: 'bg-amber-500',
            },
            EARLY_LEAVE: {
              label: isVi ? 'Về sớm' : 'Early Leave',
              color: 'bg-cyan-50 text-cyan-700 border-cyan-200',
              dot: 'bg-cyan-500',
            },
          }[col.status];

          return (
            <div
              key={col.id}
              className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/40 hover:bg-white hover:border-blue-300 hover:shadow-md transition-all group"
            >
              <div className="flex items-start gap-3">
                <div className="relative">
                  <img
                    src={col.avatar}
                    alt={col.name}
                    className="w-10 h-10 rounded-xl object-cover ring-2 ring-white shadow-sm group-hover:scale-105 transition-transform"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${statusBadge.dot}`}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="text-xs font-bold text-slate-900 truncate">{col.name}</h4>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium truncate">{col.role}</p>
                  <p className="text-[10px] text-slate-400 font-semibold truncate">{col.department}</p>
                </div>
              </div>

              <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px]">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold border ${statusBadge.color}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dot}`} />
                  {statusBadge.label}
                </span>

                {col.checkInTime ? (
                  <span className="font-mono text-slate-500 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    {col.checkInTime}
                  </span>
                ) : (
                  <span className="text-slate-400 italic">{isVi ? 'Cả ngày' : 'All day'}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
