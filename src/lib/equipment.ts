export interface Equip { id: string; project_id: string; kind: string; make: string | null; model: string; serial: string | null; quantity: number }
export interface Rej { id: string; project_id: string; authority: string; office: string | null; category: string; reason: string; resolved: boolean; created_at: string }
export const REJ_CATS = ['Missing document', 'Document mismatch', 'Drawing issue', 'Fee or payment', 'Site or inspection', 'Customer details', 'Other']
const norm = (s: string) => s.trim().toLowerCase()
// A document that names a model absent from the project's equipment registry is flagged.
export function mismatches(eq: Equip[], docs: { project_id: string; title: string; equipment_model?: string | null }[]) {
  const out: { project_id: string; message: string }[] = []
  for (const d of docs) { if (!d.equipment_model) continue; const known = eq.filter(e => e.project_id === d.project_id)
    if (known.length && !known.some(e => norm(e.model) === norm(d.equipment_model!))) out.push({ project_id: d.project_id, message: `"${d.title}" names model "${d.equipment_model}", but the registry has ${known.map(e => e.model).join(', ')}.` }) }
  return out
}
// Top rejection categories per authority, from this account's own log
export function insights(rows: Rej[]) {
  const by: Record<string, { name: string; n: number; cats: Record<string, number> }> = {}
  for (const r of rows) { const k = norm(r.authority), g = (by[k] ??= { name: r.authority.trim(), n: 0, cats: {} }); g.n++; g.cats[r.category] = (g.cats[r.category] ?? 0) + 1 }
  return Object.values(by).map(g => ({ authority: g.name, total: g.n, top: Object.entries(g.cats).sort((a, b) => b[1] - a[1]).slice(0, 3) })).sort((a, b) => b.total - a.total)
}
