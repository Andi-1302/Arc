import { createContext, createElement, useContext, useEffect, useState, type ReactNode } from 'react'
import { todayISO } from './date'

/**
 * Live "today". The day boundary is local midnight (spec §4.6), but a PWA that
 * sits open overnight would otherwise keep yesterday's date forever. This context
 * re-checks the wall clock whenever the tab becomes visible again, the window
 * regains focus, and on a timer armed for the next local midnight.
 */
const TodayContext = createContext<string>(todayISO())

export function TodayProvider({ children }: { children: ReactNode }) {
  const [today, setToday] = useState(todayISO)

  useEffect(() => {
    const sync = () => setToday((prev) => (prev === todayISO() ? prev : todayISO()))

    const onVisibility = () => {
      if (document.visibilityState === 'visible') sync()
    }

    let midnightTimer: ReturnType<typeof setTimeout>
    const armMidnightTimer = () => {
      const now = new Date()
      // One second past midnight, so todayISO() has definitely rolled over by the time we read it.
      const nextTick = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1)
      midnightTimer = setTimeout(() => {
        sync()
        armMidnightTimer()
      }, nextTick.getTime() - now.getTime())
    }
    armMidnightTimer()

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('focus', sync)

    return () => {
      clearTimeout(midnightTimer)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('focus', sync)
    }
  }, [])

  return createElement(TodayContext.Provider, { value: today }, children)
}

/** Today's ISO date (`YYYY-MM-DD`), kept current while the app stays open. */
export function useToday(): string {
  return useContext(TodayContext)
}
