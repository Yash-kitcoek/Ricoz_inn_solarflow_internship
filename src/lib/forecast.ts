export interface Row { label: string; inflow: number; outflow: number; balance: number }
type Flow = { amount: number; date: Date }
// Month-by-month cash position. Items dated before this month land in the first month (overdue money still needs paying or collecting).
export function forecast(open: number, inflows: Flow[], outflows: Flow[], today = new Date(), months = 6): Row[] {
  const rows: Row[] = []; let bal = open
  for (let i = 0; i < months; i++) {
    const s = new Date(today.getFullYear(), today.getMonth() + i, 1), e = new Date(today.getFullYear(), today.getMonth() + i + 1, 1)
    const inM = (d: Date) => (i === 0 ? d < e : d >= s && d < e), sum = (f: Flow[]) => f.filter(x => inM(x.date)).reduce((a, x) => a + x.amount, 0)
    const inflow = sum(inflows), outflow = sum(outflows); bal += inflow - outflow
    rows.push({ label: s.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }), inflow, outflow, balance: bal })
  }
  return rows
}
