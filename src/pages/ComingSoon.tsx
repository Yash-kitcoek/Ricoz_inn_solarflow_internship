export default function ComingSoon({ title }: { title: string }) {
  return <div className="card"><h1 className="text-lg font-bold">{title}</h1><p className="text-slate-500 text-sm mt-1">Not built in this scaffold yet. The tables, RLS policies and storage rules for this module already exist in supabase/migrations.</p></div>
}
