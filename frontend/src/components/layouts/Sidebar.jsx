import React, { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutGrid, Upload, BarChart3, Trophy,
  Cpu, ChevronRight, Home,
} from 'lucide-react'
import clsx from 'clsx'

const navItems = [
  { to: '/marketplace', icon: LayoutGrid, label: 'MARKETPLACE', sublabel: 'Discover agents' },
  { to: '/deploy', icon: Upload, label: 'DEPLOY', sublabel: 'Launch agent' },
  { to: '/dashboard', icon: BarChart3, label: 'DASHBOARD', sublabel: 'Analytics' },
  { to: '/leaderboard', icon: Trophy, label: 'LEADERBOARD', sublabel: 'Rankings' },
]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <motion.aside
        animate={{ width: collapsed ? 68 : 220 }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        className="hidden lg:flex flex-col h-screen bg-[var(--color-panel)] border-r border-[var(--color-border)] relative z-20 overflow-hidden shrink-0"
      >
        {/* Logo */}
        <NavLink to="/" className="block">
          <div className="flex items-center gap-3 p-4 border-b border-[var(--color-border)] cursor-pointer hover:bg-[var(--color-nebula-deep)] transition-colors">
            <div className="w-8 h-8 rounded-lg bg-[var(--color-nebula)] border border-[var(--color-border-bright)] flex items-center justify-center shrink-0">
              <Cpu size={15} className="text-[var(--color-purple-bright)]" />
            </div>

            <AnimatePresence>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.18 }}
                >
                  <div className="font-display font-bold text-sm text-[var(--color-text-primary)] tracking-[0.15em]">
                    AGENTRA
                  </div>
                  <div className="font-mono text-[9px] text-[color-purple-bright)] tracking-[0.4em]">
                    NEURAL MARKET
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </NavLink>

        {/* Nav items */}
        <nav className="flex-1 p-2.5 space-y-1">
          {navItems.map(({ to, icon: Icon, label, sublabel }) => {
            const isActive = location.pathname.startsWith(to)
            return (
              <NavLink key={to} to={to} style={{ cursor: 'pointer' }}>
                <motion.div
                  whileHover={{ x: 2 }}
                  className={clsx(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200',
                    isActive ? 'nav-link-active' : 'nav-link-idle'
                  )}
                >
                  <Icon size={16} className={isActive ? 'text-[var(--color-purple-bright)]' : 'text-[var(--color-text-dim)]'} />
                  <AnimatePresence>
                    {!collapsed && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex-1 min-w-0"
                      >
                        <div className="text-[10px] font-mono tracking-[0.15em]">{label}</div>
                        <div className="text-[9px] text-[var(--color-text-dim)]">{sublabel}</div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {isActive && !collapsed && (
                    <ChevronRight size={11} className="ml-auto text-[var(--color-purple-bright)]" />
                  )}
                </motion.div>
              </NavLink>
            )
          })}
        </nav>

        {/* Home link */}
        <div className="px-2.5 pb-1">
          <NavLink to="/" style={{ cursor: 'pointer' }}>
            <div className="flex items-center gap-3 rounded-lg px-3 py-2 transition-all duration-200 nav-link-idle">
              <Home size={14} className="text-[var(--color-text-dim)]" />
              {!collapsed && (
                <span className="text-[10px] font-mono tracking-[0.15em] text-[var(--color-text-dim)]">HOME</span>
              )}
            </div>
          </NavLink>
        </div>

        {/* Collapse toggle */}
        <div className="p-2.5 border-t border-[var(--color-border)]">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center gap-2 p-2 rounded-lg text-[var(--color-text-dim)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-nebula-deep)] transition-all cursor-pointer"
          >
            <motion.div animate={{ rotate: collapsed ? 0 : 180 }}>
              <ChevronRight size={14} />
            </motion.div>
            {!collapsed && <span className="text-[10px] font-mono tracking-widest">COLLAPSE</span>}
          </button>
        </div>
      </motion.aside>

      {/* ── Mobile bottom navigation ── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 glass-panel border-t border-[var(--color-border)]">
        <div className="flex items-center justify-around py-2 px-1">
          {navItems.map(({ to, icon: Icon, label }) => {
            const isActive = location.pathname.startsWith(to)
            return (
              <NavLink key={to} to={to} className="flex flex-col items-center gap-0.5 py-1.5 px-2 rounded-lg transition-colors">
                <Icon size={18} className={isActive ? 'text-[var(--color-purple-bright)]' : 'text-[var(--color-text-dim)]'} />
                <span className={clsx(
                  'text-[8px] font-mono tracking-[0.1em]',
                  isActive ? 'text-[var(--color-purple-bright)]' : 'text-[var(--color-text-dim)]'
                )}>
                  {label.slice(0, 6)}
                </span>
              </NavLink>
            )
          })}
        </div>
      </nav>
    </>
  )
}