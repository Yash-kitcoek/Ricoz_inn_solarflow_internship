'use client'
import { useEffect } from 'react'

export function usePolling(reload, intervalMs = 10000) {
  useEffect(() => {
    let pending = false
    const refresh = () => {
      if (pending || document.visibilityState !== 'visible') return
      pending = true
      Promise.resolve(reload()).finally(() => { pending = false })
    }
    const timer = setInterval(refresh, intervalMs)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [reload, intervalMs])
}
