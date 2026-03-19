import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/layouts/Layout'
import LandingLayout from './components/layouts/LandingLayout'
import LandingPage from './pages/LandingPage'
import Marketplace from './pages/Marketplace'
import AgentDetail from './pages/AgentDetail'
import DeployStudio from './pages/DeployStudio'
import Dashboard from './pages/Dashboard'
import Leaderboard from './pages/Leaderboard'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing page with its own layout (navbar, no sidebar) */}
        <Route element={<LandingLayout />}>
          <Route path="/" element={<LandingPage />} />
        </Route>

        {/* App pages with sidebar layout */}
        <Route element={<Layout />}>
          <Route path="marketplace" element={<Marketplace />} />
          <Route path="agent/:id" element={<AgentDetail />} />
          <Route path="deploy" element={<DeployStudio />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="leaderboard" element={<Leaderboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App