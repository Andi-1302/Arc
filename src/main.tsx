import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import './db'
import App from './App.tsx'
import Today from './pages/Today.tsx'
import Goals from './pages/Goals.tsx'
import GoalDetail from './pages/GoalDetail.tsx'
import Stats from './pages/Stats.tsx'
import More from './pages/More.tsx'
import Cycles from './pages/Cycles.tsx'
import WeeklyReviews from './pages/WeeklyReviews.tsx'
import Routines from './pages/Routines.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<App />}>
          <Route index element={<Today />} />
          <Route path="goals" element={<Goals />} />
          <Route path="goals/:goalId" element={<GoalDetail />} />
          <Route path="stats" element={<Stats />} />
          <Route path="more" element={<More />} />
          <Route path="more/cycles" element={<Cycles />} />
          <Route path="more/reviews" element={<WeeklyReviews />} />
          <Route path="more/routines" element={<Routines />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
