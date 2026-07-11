import { Outlet } from 'react-router-dom'
import TabBar from './components/TabBar'
import ScoreBadge from './components/ScoreBadge'

export default function App() {
  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col bg-bg">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-black/5 bg-bg/95 px-4 py-3 backdrop-blur">
        <span className="font-display text-lg font-semibold tracking-tight">Blocks</span>
        <ScoreBadge />
      </header>
      <div className="flex-1">
        <Outlet />
      </div>
      <TabBar />
    </div>
  )
}
