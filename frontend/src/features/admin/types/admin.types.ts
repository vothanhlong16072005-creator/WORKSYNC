export interface AdminKpiStats {
  totalUsers: number;
  activeUsers: number;
  totalDepartments: number;
  totalProjects: number;
  activeProjects: number;
  todayAttendanceRate: number;
  totalDocuments: number;
  totalMeetings: number;
}

export interface AdminRoleDistribution {
  role: 'ADMIN' | 'HR' | 'PM' | 'EMPLOYEE' | 'DEPARTMENT_HEAD';
  label: string;
  count: number;
  color: string;
}

export interface AdminDepartmentStat {
  id: string;
  code: string;
  name: string;
  userCount: number;
  projectCount: number;
  managerName?: string;
}

export interface AdminTodayAttendance {
  totalExpected: number;
  present: number;
  onTime: number;
  late: number;
  wfh: number;
  leave: number;
  earlyLeave: number;
}

export interface AdminProjectStats {
  total: number;
  planning: number;
  active: number;
  completed: number;
  onHold: number;
  scrumCount: number;
  kanbanCount: number;
}

export interface AdminSystemHealth {
  uptime: string;
  dbSize: string;
  apiRequestsToday: number;
  cpuUsagePercent: number;
  memoryUsagePercent: number;
  dbConnectionsActive: number;
  dbConnectionsMax: number;
  geofenceRadiusMeters: number;
}

export interface AdminOverviewData {
  kpis: AdminKpiStats;
  roleDistribution: AdminRoleDistribution[];
  departmentStats: AdminDepartmentStat[];
  todayAttendance: AdminTodayAttendance;
  projectStats: AdminProjectStats;
  systemHealth: AdminSystemHealth;
}

export interface AdminUserItem {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  role: 'ADMIN' | 'HR' | 'PM' | 'EMPLOYEE' | 'DEPARTMENT_HEAD';
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  position: string | null;
  createdAt: string;
  departmentId: string | null;
  department?: {
    id: string;
    code: string;
    name: string;
  } | null;
  _count: {
    assignedTasks: number;
    projectMemberships: number;
  };
}

export interface AdminDepartmentItem {
  id: string;
  code: string;
  name: string;
  description: string | null;
  managerId: string | null;
  manager?: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
  } | null;
  users: Array<{
    id: string;
    name: string;
    email: string;
    avatar: string | null;
    role: string;
    position: string | null;
    status: string;
  }>;
  projects: Array<{
    id: string;
    name: string;
    code: string;
    status: string;
    workflowType: string;
  }>;
  _count: {
    users: number;
    projects: number;
    documents: number;
  };
}

export interface AdminProjectItem {
  id: string;
  name: string;
  code: string;
  status: string;
  workflowType: string;
  color?: string | null;
  manager?: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
  } | null;
  department?: {
    id: string;
    name: string;
    code: string;
  } | null;
  memberCount: number;
  sprintCount: number;
  taskCount: number;
  completedTaskCount: number;
  progressPercent: number;
}

export interface AdminDocumentItem {
  id: string;
  title: string;
  scope: string;
  type: string;
  updatedAt: string;
  owner?: {
    id: string;
    name: string;
    avatar: string | null;
  } | null;
  department?: {
    id: string;
    name: string;
  } | null;
  project?: {
    id: string;
    name: string;
  } | null;
}

export interface AdminMeetingItem {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  status: string;
  scope: string;
  creator?: {
    id: string;
    name: string;
    avatar: string | null;
  } | null;
  department?: {
    id: string;
    name: string;
  } | null;
  project?: {
    id: string;
    name: string;
  } | null;
  _count: {
    attendees: number;
  };
}
