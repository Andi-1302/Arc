import { Outlet, useLocation } from 'react-router-dom'
import TabBar from './components/TabBar'
import ScoreBadge from './components/ScoreBadge'
import ErrorBoundary from './components/ErrorBoundary'

export default function App() {
  // Keyed by pathname: ScoreBadge never remounts on navigation, so a tripped
  // boundary needs a new key to reset — this is also what makes "switch tabs
  // and back" the working recovery path if something here ever does throw.
  const { pathname } = useLocation()

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col bg-bg">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-black/5 bg-bg/95 px-4 py-3 backdrop-blur">
        <span className="font-display text-lg font-semibold tracking-tight">Blocks</span>
        <ErrorBoundary key={pathname} fallback={null}>
          <ScoreBadge />
        </ErrorBoundary>
      </header>
      <div className="flex-1">
        <ErrorBoundary
          key={pathname}
          fallback={
            <div className="p-4">
              <p className="text-sm font-medium">Something went wrong loading this page.</p>
              <p className="mt-1 text-sm opacity-60">Try switching tabs and coming back.</p>
            </div>
          }
        >
          <Outlet />
        </ErrorBoundary>
      </div>
      <TabBar />
    </div>
  )
}
