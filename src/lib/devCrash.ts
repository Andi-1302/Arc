/**
 * Lets e2e tests force a real render-time throw to verify error boundary coverage.
 * `import.meta.env.DEV` is statically replaced with `false` in production builds,
 * so this whole check (and the throw) is dead-code-eliminated and ships nothing.
 */
export function throwIfDevCrashRequested(id: string) {
  if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('e2e_crash') === id) {
    throw new Error(`E2E forced crash: ${id}`)
  }
}
