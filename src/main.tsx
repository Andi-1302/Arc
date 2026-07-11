import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import './db'
import App from './App.tsx'
import Today from './pages/Today.tsx'
import Goals from './pages/Goals.tsx'
import Stats from './pages/Stats.tsx'
import More from './pages/More.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<App />}>
          <Route index element={<Today />} />
          <Route path="goals" element={<Goals />} />
          <Route path="stats" element={<Stats />} />
          <Route path="more" element={<More />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
