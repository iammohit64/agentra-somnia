import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Radio, Bell, ChevronDown, Repeat } from 'lucide-react'
import { useWeb3Modal } from '@web3modal/wagmi/react'
import { useAccount, useDisconnect, useBalance } from 'wagmi'
import NeonButton from '../ui/NeonButton'
import { analyticsAPI } from '../../api/analytics'

export default function TopBar() {
  const { open } = useWeb3Modal()
  const { address, isConnected, chain } = useAccount()
  const { disconnect } = useDisconnect()
  const { data: balanceData } = useBalance({ address })
  const [stats, setStats] = useState(null)

  useEffect(() => {
    analyticsAPI.getGlobalStats()
      .then(res => setStats(res.data))
      .catch(console.error)
  }, [])

  return (
    <header className="h-13 glass-panel border-b border-[var(--color-border)] flex items-center justify-between px-4 sm:px-5 shrink-0 z-10">
      {/* Left */}
      <div className="flex items-center gap-4">
        <Link to="/" className="lg:hidden flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-md bg-[var(--color-nebula)] border border-[var(--color-border-bright)] flex items-center justify-center">
            <img src="/logo.png" className="w-7 h-7 object-contain" />
          </div>
          <span className="font-display font-bold text-xs text-[var(--color-text-primary)] tracking-[0.15em]">AGENTRA</span>
        </Link>

        <div className="hidden sm:flex items-center gap-2 text-[var(--color-success)] text-[10px] font-mono tracking-widest">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)] pulse-dot" />
          NETWORK ONLINE
        </div>
        
        {/* Dynamic Network Indicator */}
        <div className="hidden md:flex items-center gap-1.5 text-[var(--color-text-dim)] text-[10px] font-mono tracking-widest uppercase">
          <Radio size={11} />
          {isConnected && chain ? chain.name : 'DISCONNECTED'}
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--color-nebula-deep)] border border-[var(--color-border)] text-[10px] font-mono text-[var(--color-text-dim)]"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-purple-bright)] pulse-dot" />
          AGENTS: {stats?.activeAgents || 0} ONLINE
        </motion.div>

        <Bell
          size={16}
          className="text-[var(--color-text-dim)] hover:text-[var(--color-text-secondary)] cursor-pointer transition-colors"
        />

        {isConnected ? (
          <div className="flex items-center gap-2">
            {/* Native Network Switcher Button */}
            <button
              onClick={() => open({ view: 'Networks' })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-bright)] transition-all cursor-pointer"
            >
              <Repeat size={11} />
              <span className="text-[10px] font-mono hidden sm:inline">SWITCH CHAIN</span>
            </button>

            {/* Wallet Button */}
            <button
              onClick={() => disconnect()}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--color-nebula)] border border-[var(--color-border-bright)] text-[var(--color-purple-bright)] hover:border-[var(--color-purple-core)] hover:shadow-[var(--shadow-glow-soft)] transition-all cursor-pointer"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-purple-bright)] pulse-dot" />
              <span className="text-[10px] font-mono">{`${address.slice(0, 6)}...${address.slice(-4)}`}</span>
              {balanceData && (
                <span className="hidden sm:inline text-[10px] font-mono text-[var(--color-text-muted)]">
                  {parseFloat(balanceData.formatted).toFixed(3)} {balanceData.symbol}
                </span>
              )}
              <ChevronDown size={11} />
            </button>
          </div>
        ) : (
          <NeonButton size="sm" onClick={() => open()}>
            CONNECT WALLET
          </NeonButton>
        )}
      </div>
    </header>
  )
}