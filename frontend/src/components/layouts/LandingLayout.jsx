import React, { useState, useEffect } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Cpu, Menu, X } from 'lucide-react'
import StarField from '../ui/StarField'
import NeuralGrid from '../ui/NeuralGrid'

const navLinks = [
  { to: '/marketplace', label: 'MARKETPLACE' },
  { to: '/deploy', label: 'DEPLOY' },
  { to: '/dashboard', label: 'DASHBOARD' },
  { to: '/leaderboard', label: 'LEADERBOARD' },
]

export default function LandingLayout() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  /* Close mobile nav on route change */
  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  return (
    <div className="min-h-screen relative" style={{ background: '#000' }}>
      <StarField />
      <NeuralGrid />

      {/* ── Sticky Navbar ── */}
      <header className={`landing-nav ${scrolled ? 'scrolled' : ''} fixed top-0 left-0 right-0 z-50`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-[var(--color-nebula)] border border-[var(--color-border-bright)] flex items-center justify-center">
              <Cpu size={15} className="text-[var(--color-purple-bright)]" />
            </div>
            <div>
              <div className="font-display font-bold text-sm text-[var(--color-text-primary)] tracking-[0.15em]">AGENTRA</div>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className="px-4 py-2 rounded-lg text-[11px] font-mono tracking-[0.15em] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[rgba(255,255,255,0.03)] transition-all duration-200"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link to="/marketplace">
              <button className="btn-glow px-5 py-2 rounded-lg text-[11px] inline-flex items-center gap-2 cursor-pointer">
                LAUNCH APP
              </button>
            </Link>
          </div>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden text-[var(--color-text-secondary)] p-2 rounded-lg hover:bg-[rgba(255,255,255,0.05)] transition-colors cursor-pointer"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile nav */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden border-t border-[var(--color-border)] overflow-hidden"
            >
              <nav className="flex flex-col p-4 gap-1">
                {navLinks.map(link => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="px-4 py-3 rounded-lg text-[11px] font-mono tracking-[0.15em] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[rgba(255,255,255,0.03)] transition-all"
                  >
                    {link.label}
                  </Link>
                ))}
                <Link to="/marketplace" className="mt-2">
                  <button className="btn-glow w-full px-5 py-2.5 rounded-lg text-[11px] inline-flex items-center justify-center gap-2 cursor-pointer">
                    LAUNCH APP
                  </button>
                </Link>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ── Page Content ── */}
      <main className="relative z-10">
        <Outlet />
      </main>
    </div>
  )
}
