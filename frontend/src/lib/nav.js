import { LayoutDashboard, FolderKanban, ShieldCheck, Zap, Wallet, HardHat, Settings } from 'lucide-react'
const ALL = ['admin', 'project_manager', 'engineer', 'contractor', 'finance'], STAFF = ['admin', 'project_manager', 'engineer']
// UI-level access only. The backend enforces the same rules on every request.
export const NAV = [{ href: '/', label: 'Overview', icon: LayoutDashboard, roles: ALL }, { href: '/projects', label: 'Projects', icon: FolderKanban, roles: ALL },
  { href: '/permits', label: 'Permits & Approvals', icon: ShieldCheck, roles: STAFF }, { href: '/net-metering', label: 'Net Metering', icon: Zap, roles: STAFF },
  { href: '/payments', label: 'Payments', icon: Wallet, roles: ['admin', 'project_manager', 'finance', 'contractor'] }, { href: '/contractors', label: 'Contractors', icon: HardHat, roles: ['admin', 'project_manager', 'finance'] },
  { href: '/settings', label: 'Users & Roles', icon: Settings, roles: ['admin'] }]
export const canSee = (role, pathname) => { const n = [...NAV].sort((a, b) => b.href.length - a.href.length).find(x => (x.href === '/' ? pathname === '/' : pathname.startsWith(x.href))); return !!n && n.roles.includes(role) }
export const isStaff = role => STAFF.includes(role)
