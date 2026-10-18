import type { Role } from '../types'
const ALL: Role[] = ['admin', 'project_manager', 'engineer', 'contractor', 'finance']
// UI-level access only. The database enforces the real rules (row level security); this just avoids showing pages a role cannot use.
const ACCESS: Record<string, Role[]> = { '': ALL, projects: ALL, notifications: ALL, settings: ALL,
  permits: ['admin', 'project_manager', 'engineer'], 'net-metering': ['admin', 'project_manager', 'engineer'], documents: ALL,
  tasks: ['admin', 'project_manager', 'engineer', 'contractor'], contractors: ['admin', 'project_manager', 'engineer', 'finance'],
  payments: ['admin', 'project_manager', 'finance', 'contractor'], reports: ['admin', 'project_manager', 'finance'], forecast: ['admin', 'project_manager', 'finance'], equipment: ['admin', 'project_manager', 'engineer', 'contractor'], rejections: ['admin', 'project_manager', 'engineer'], weather: ['admin', 'project_manager', 'engineer', 'contractor'], subsidy: ['admin', 'project_manager', 'engineer', 'finance'], 'after-install': ['admin', 'project_manager', 'engineer'] }
const ACTIONS: Record<string, Role[]> = { 'project.create': ['admin', 'project_manager'], 'project.edit': ['admin', 'project_manager'], 'users.manage': ['admin'], 'equipment.edit': ['admin', 'project_manager', 'engineer'], 'contractor.manage': ['admin', 'project_manager'] }
export const canView = (role: Role | null, path: string) => !!role && (ACCESS[path.split('/')[1] ?? ''] ?? []).includes(role)
export const can = (role: Role | null, action: string) => !!role && (ACTIONS[action] ?? []).includes(role)
