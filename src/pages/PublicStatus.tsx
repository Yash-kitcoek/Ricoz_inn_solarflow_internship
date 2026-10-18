import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getPublicStatus, type PublicStatus as S } from '../lib/api4'
import { SunLogo, Progress, Badge } from '../components/ui'
import { useT, LangSwitch } from '../i18n'
const SAY: Record<string, string> = { 'Not Started': 'We are preparing your utility application.', 'Documents Required': 'We are gathering the documents the utility needs.', 'Ready to Submit': 'Your application is ready and will be submitted shortly.',
  'Submitted': 'Your application has been submitted and is waiting for the utility to review it.', 'Under Review': 'The utility is reviewing your application.', 'Inspection Scheduled': 'An inspection has been scheduled.',
  'Approved': 'Your application is approved. The meter and grid connection are being arranged.', 'Rejected': 'The utility asked for changes. We are fixing and resubmitting.', 'Connected to Grid': 'Your system is connected to the grid.' }
export default function PublicStatus() {
  const { token } = useParams(), { t } = useT(); const [s, setS] = useState<S | null>(null), [err, setErr] = useState<string | null>(null)
  useEffect(() => { void getPublicStatus(token ?? '').then(r => { setS(r.data); setErr(r.error) }) }, [token])
  return <div className="mx-auto max-w-lg p-4"><div className="my-6 flex items-center justify-between"><span className="flex items-center gap-2"><SunLogo size={30}/><span className="text-xl font-bold">SolarFlow <span className="text-amber">OS</span></span></span><LangSwitch/></div>
    {err && <div className="card" role="alert">{t(err)}</div>}{!s && !err && <div className="card">{t('Loading…')}</div>}
    {s && <div className="card space-y-3"><h1>{s.project_name}</h1><div><Badge text={s.status}/></div><Progress value={s.progress}/>
      {s.nm_status && <div className="rounded-xl bg-slate-50 p-3 text-sm"><b>{t('Utility application')}</b><p className="mt-1">{t(SAY[s.nm_status] ?? '')}{s.nm_waiting_days !== null && s.nm_status !== 'Connected to Grid' ? ' ' + t('In this stage for {n} days.', { n: s.nm_waiting_days }) : ''}</p></div>}
      <p className="text-xs text-slate-500">{t('Last updated')} {new Date(s.updated_at).toLocaleDateString('en-IN')}. {t("Status is entered by your installer and may differ from the utility's own records.")}</p></div>}</div>
}
