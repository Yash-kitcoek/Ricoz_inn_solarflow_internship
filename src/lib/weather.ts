export interface Day { date: string; rainProb: number; rainMm: number; wind: number; gust: number }
export interface Th { rain: number; wind: number }
// Open-Meteo: free for non-commercial use, no key. Check its terms and plans before commercial use.
export async function fetchForecast(lat: number, lng: number): Promise<Day[]> {
  const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=precipitation_probability_max,precipitation_sum,wind_speed_10m_max,wind_gusts_10m_max&timezone=auto&forecast_days=14`)
  if (!r.ok) throw new Error('Weather service error ' + r.status)
  const d = (await r.json()).daily as { time: string[]; precipitation_probability_max: (number | null)[]; precipitation_sum: (number | null)[]; wind_speed_10m_max: (number | null)[]; wind_gusts_10m_max: (number | null)[] }
  return d.time.map((t, i) => ({ date: t, rainProb: d.precipitation_probability_max[i] ?? 0, rainMm: d.precipitation_sum[i] ?? 0, wind: d.wind_speed_10m_max[i] ?? 0, gust: d.wind_gusts_10m_max[i] ?? 0 }))
}
export const risks = (d: Day, th: Th) => [...(d.rainProb >= th.rain ? [`rain chance ${d.rainProb}%`] : []), ...(d.wind >= th.wind || d.gust >= th.wind * 1.5 ? [`wind up to ${Math.round(Math.max(d.wind, d.gust))} km/h`] : [])]
