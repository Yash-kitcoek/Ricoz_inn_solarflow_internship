'use client'
import { useCallback, useEffect, useState } from 'react'
export function useLoad(fn, deps = []) {
  const [data, setData] = useState(null), [error, setError] = useState(null), [loading, setLoading] = useState(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const reload = useCallback(async () => { try { setError(null); setData(await fn()) } catch (e) { setError(e.message) } finally { setLoading(false) } }, deps)
  useEffect(() => { reload() }, [reload])
  return { data, error, loading, reload }
}
