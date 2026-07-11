import { Outlet } from 'react-router-dom'
import TabBar from './components/TabBar'

export default function App() {
  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col bg-bg">
      <div className="flex-1">
        <Outlet />
      </div>
      <TabBar />
    </div>
  )
}
