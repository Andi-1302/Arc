import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/', label: 'Today', end: true },
  { to: '/week', label: 'Week', end: false },
  { to: '/goals', label: 'Goals', end: false },
  { to: '/stats', label: 'Stats', end: false },
  { to: '/more', label: 'More', end: false },
]

export default function TabBar() {
  return (
    <nav className="sticky bottom-0 border-t border-black/10 bg-surface">
      <ul className="mx-auto flex max-w-xl">
        {tabs.map((tab) => (
          <li key={tab.to} className="flex-1">
            <NavLink
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium ${
                  isActive ? 'text-accent' : 'text-ink/60'
                }`
              }
            >
              {tab.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
