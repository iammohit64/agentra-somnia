import React from 'react'
import { useAccount, useSwitchChain } from 'wagmi'
import { SUPPORTED_CHAINS } from '../../config/chains.config'
import NeonButton from '../ui/NeonButton'

export default function NetworkEnforcer({ children }) {
  const { chain, isConnected } = useAccount()
  const { switchChain, isPending } = useSwitchChain()

  const isUnsupported = isConnected && chain && !SUPPORTED_CHAINS.find(c => c.id === chain.id)

  if (!isUnsupported) return children

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-bg)]/90 backdrop-blur-md">
      <div className="glass-panel p-8 max-w-md w-full border border-red-500/30 flex flex-col items-center text-center">
        <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mb-4 border border-red-500/50">
          <span className="text-red-400 text-xl font-bold">!</span>
        </div>
        <h2 className="text-xl font-display text-white mb-2">Unsupported Network</h2>
        <p className="text-[var(--color-text-secondary)] text-sm mb-6 font-mono">
          Your wallet is connected to an unsupported chain. Please switch to one of our active networks to continue.
        </p>
        <div className="flex flex-col gap-3 w-full">
          {SUPPORTED_CHAINS.map((c) => (
            <NeonButton 
              key={c.id} 
              onClick={() => switchChain({ chainId: c.id })}
              loading={isPending}
            >
              SWITCH TO {c.name.toUpperCase()}
            </NeonButton>
          ))}
        </div>
      </div>
    </div>
  )
}