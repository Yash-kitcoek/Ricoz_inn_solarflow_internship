import type { ReactNode } from 'react'
import { useT } from '../i18n'
export type Tone = 'ok' | 'warn' | 'bad' | 'info'
const TONES: Record<Tone, string> = { ok: 'bg-green-100 text-green-800', warn: 'bg-amber/25 text-amber-900', bad: 'bg-red-100 text-red-800', info: 'bg-blue-100 text-blue-800' }
export function statusTone(s: string): Tone {
  const k = s.toLowerCase()
  if (['completed', 'approved', 'connected to grid', 'paid'].includes(k)) return 'ok'
  if (['on hold', 'blocked', 'rejected', 'disputed'].includes(k)) return 'bad'
  if (['draft', 'planning', 'permitting', 'submitted', 'under review', 'not started', 'to do', 'pending verification', 'pending approval'].includes(k)) return 'warn'
  return 'info'
}
export const Badge = ({ text, tone }: { text: string; tone?: Tone }) => { const { t } = useT(); return <span className={`badge ${TONES[tone ?? statusTone(text)]}`}>{t(text)}</span> }
export const Progress = ({ value }: { value: number }) => { const v = Math.min(100, Math.max(0, value)), c = v < 40 ? '#F4B942' : v >= 85 ? '#1E9E5A' : '#2878D0'
  return <div className="flex items-center gap-2" role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100}><div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-200/70"><div className="h-full rounded-full" style={{ width: `${v}%`, background: c }}/></div><span className="w-10 text-right text-xs text-slate-600">{v}%</span></div> }
export function HeroArt() {
  const L = (a: number[], b: number[], t: number) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], TL = [200, 100], TR = [400, 45], BR = [430, 190], BL = [160, 190]
  return <svg className="pointer-events-none absolute inset-y-0 right-0 h-full w-[55%] max-w-[460px]" viewBox="0 0 400 180" preserveAspectRatio="xMaxYMid slice" aria-hidden="true">
    <defs><linearGradient id="pg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#3b8be0"/><stop offset="1" stopColor="#14407a"/></linearGradient><radialGradient id="sg"><stop offset="0" stopColor="#FFE08A"/><stop offset="1" stopColor="#F4B942" stopOpacity="0"/></radialGradient></defs>
    <circle cx="300" cy="46" r="50" fill="url(#sg)"/><circle cx="300" cy="46" r="17" fill="#F7C95A"/>{Array.from({ length: 10 }, (_, i) => <line key={i} x1="300" y1="14" x2="300" y2="21" stroke="#F7C95A" strokeWidth="2.5" strokeLinecap="round" transform={`rotate(${i * 36} 300 46)`}/>)}
    <polygon points={[TL, TR, BR, BL].map(q => q.join(',')).join(' ')} fill="url(#pg)" stroke="#cfe3ff" strokeOpacity=".5"/>
    {[1, 2, 3, 4, 5].map(i => { const a = L(TL, TR, i / 6), b = L(BL, BR, i / 6); return <line key={'v' + i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#cfe3ff" strokeOpacity=".4"/> })}
    {[1, 2, 3].map(j => { const a = L(TL, BL, j / 4), b = L(TR, BR, j / 4); return <line key={'h' + j} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#cfe3ff" strokeOpacity=".4"/> })}</svg>
}
export const Skeleton = ({ className = '' }: { className?: string }) => <div className={`animate-pulse rounded-xl bg-slate-200/80 ${className}`}/>
export const Empty = ({ title, hint }: { title: string; hint?: string }) => <div className="py-10 text-center"><div className="mx-auto mb-3 h-10 w-10 rounded-full bg-amber/30"/><p className="font-semibold">{title}</p>{hint && <p className="text-sm text-slate-500">{hint}</p>}</div>
export const PageHeader = ({ title, children }: { title: string; children?: ReactNode }) => <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h1>{title}</h1><div className="flex gap-2">{children}</div></div>
export const SunLogo = ({ size = 28 }: { size?: number }) => <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="6" fill="#F4B942"/>{Array.from({ length: 8 }, (_, i) => <line key={i} x1="16" y1="3" x2="16" y2="7" stroke="#F4B942" strokeWidth="2.4" strokeLinecap="round" transform={`rotate(${i * 45} 16 16)`}/>)}</svg>
