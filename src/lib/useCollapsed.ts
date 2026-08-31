import { useCallback, useState } from 'react'

const keyFor = (section: string) => `stats.collapsed.${section}`

function read(section: string): boolean {
  try {
    return localStorage.getItem(keyFor(section)) === '1'
  } catch {
    return false
  }
}

function write(section: string, collapsed: boolean): void {
  try {
    localStorage.setItem(keyFor(section), collapsed ? '1' : '0')
  } catch {
    // Storage blocked (private mode, disabled cookies) — collapse state just won't persist.
  }
}

/** Per-section collapse state, persisted in localStorage. Safe when storage is unavailable. */
export function useCollapsed(section: string): [boolean, () => void] {
  const [collapsed, setCollapsed] = useState(() => read(section))
  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev
      write(section, next)
      return next
    })
  }, [section])
  return [collapsed, toggle]
}
