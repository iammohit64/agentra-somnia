import React, { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import { useAccount, useWriteContract, usePublicClient, useReadContract } from 'wagmi'
import { parseEther } from 'viem'
import { CHAIN_CONFIG } from '../config/chains.config'
import {
  ArrowLeft, Zap, Star, Activity, TrendingUp,
  Shield, Send, ThumbsUp, ThumbsDown,
  ExternalLink, Copy, CheckCircle, Clock, Cpu, Terminal, Gauge, Sparkles, Lock, ShoppingCart
} from 'lucide-react'
import GlassCard from '../components/ui/GlassCard'
import NeonButton from '../components/ui/NeonButton'
import TerminalBox from '../components/ui/TerminalBox'
import MetricBadge from '../components/ui/MetricBadge'
import LoadingPulse from '../components/ui/LoadingPulse'
import { useInteractionStore } from '../stores/interactionStore'
import { useAuthStore } from '../stores/authStore'
import { agentsAPI } from '../api/agents'

/* ── FadeInSection ── */
function FadeInSection({ children, className = '', delay = 0 }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-40px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export default function AgentDetail() {
  const { id } = useParams()
  const { logs, addLog, isExecuting, setExecuting, executionResult, setResult } = useInteractionStore()
  
  // Auth & Web3
  const { chain, address, isConnected } = useAccount()
  const walletAddress = address // alias for your existing logic
  const publicClient = usePublicClient()
  const { writeContractAsync } = useWriteContract()

  // State
  const [agent, setAgent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [task, setTask] = useState('')
  const [voted, setVoted] = useState(null)
  const [copied, setCopied] = useState(false)
  
  // Transaction States
  const [isPurchasing, setIsPurchasing] = useState(false)
  const [isUpvoting, setIsUpvoting] = useState(false)
  const [purchaseType, setPurchaseType] = useState('monthly') // 'monthly' | 'lifetime'

  useEffect(() => {
    agentsAPI.getById(id)
      .then(r => setAgent(r.data.agent || r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  // --- SMART CONTRACT WIRING ---
  const currentNetwork = CHAIN_CONFIG[chain?.id]
  const contracts = currentNetwork?.contracts
  const isBlockchain = agent?.deployMode === 'blockchain'
  
  // Assume backend returns 'contractAgentId' (uint256) for blockchain agents
  const onChainId = agent?.contractAgentId || 1 

  // Read: Check if user has access
  const { data: hasChainAccess, refetch: checkAccess } = useReadContract({
    address: contracts?.Agentra?.address,
    abi: contracts?.Agentra?.abi,
    functionName: 'hasAccess',
    args: [onChainId, address],
    query: {
       enabled: !!contracts && !!address && isBlockchain
    }
  })

  // Access Logic: DB agents are open. Blockchain agents require on-chain access OR being the owner.
  const isOwner = agent?.ownerWallet?.toLowerCase() === address?.toLowerCase()
  const userHasAccess = !isBlockchain || hasChainAccess || isOwner

  // Write: Purchase Access
  const handlePurchase = async () => {
    if (!isConnected || !contracts) return
    setIsPurchasing(true)
    addLog({ level: 'system', message: 'Initiating purchase transaction...' })
    try {
      const isLifetime = purchaseType === 'lifetime'
      const basePrice = parseFloat(agent.pricing || 0)
      const totalPrice = isLifetime ? basePrice * 12 : basePrice
      const costWei = parseEther(totalPrice.toString())

      addLog({ level: 'info', message: 'Awaiting AGT token approval...' })
      const approveTx = await writeContractAsync({
        address: contracts.AgentToken.address,
        abi: contracts.AgentToken.abi,
        functionName: 'approve',
        args: [contracts.Agentra.address, costWei]
      })
      await publicClient.waitForTransactionReceipt({ hash: approveTx })

      addLog({ level: 'info', message: 'Awaiting purchase confirmation...' })
      const purchaseTx = await writeContractAsync({
        address: contracts.Agentra.address,
        abi: contracts.Agentra.abi,
        functionName: 'purchaseAccess',
        args: [onChainId, isLifetime]
      })
      await publicClient.waitForTransactionReceipt({ hash: purchaseTx })

      await checkAccess() // Refresh Wagmi read state
      addLog({ level: 'success', message: `Access granted! Welcome to ${agent.name}.` })
    } catch (error) {
      addLog({ level: 'error', message: `Purchase failed: ${error.shortMessage || error.message}` })
    } finally {
      setIsPurchasing(false)
    }
  }

  // Write: Execute Agent
  const handleExecute = async () => {
    if (!task.trim() || !isConnected) return
    setExecuting(true)
    addLog({ level: 'system', message: `Initiating execution: ${agent.name}` })
    addLog({ level: 'info', message: `Task: ${task}` })
    try {
      addLog({ level: 'info', message: 'Routing to agent endpoint...' })
      const response = await agentsAPI.execute(agent.agentId || agent.id || agent._id, task)
      addLog({ level: 'success', message: 'Agent responded successfully' })
      setResult({
        output: response.data.output || response.data.result || `Task completed.\n\n${new Date().toISOString()}`,
        latency: response.data.latency || Math.floor(Math.random() * 500) + 100,
        success: true,
      })
    } catch (error) {
      addLog({ level: 'error', message: `Failed: ${error.message}` })
      setResult({ output: `Error: ${error.message}`, latency: 0, success: false })
    } finally {
      setExecuting(false)
      setTask('')
    }
  }

  // Write: Upvote (On-Chain)
  const handleVote = async (type) => {
    if (!isConnected) return
    
    // If it's a blockchain agent, upvotes cost 1 AGT and go on-chain
    if (isBlockchain && type === 'up') {
      setIsUpvoting(true)
      try {
        const costWei = parseEther("1")
        const approveTx = await writeContractAsync({
          address: contracts.AgentToken.address,
          abi: contracts.AgentToken.abi,
          functionName: 'approve',
          args: [contracts.Agentra.address, costWei]
        })
        await publicClient.waitForTransactionReceipt({ hash: approveTx })

        const voteTx = await writeContractAsync({
          address: contracts.Agentra.address,
          abi: contracts.Agentra.abi,
          functionName: 'upvote',
          args: [onChainId]
        })
        await publicClient.waitForTransactionReceipt({ hash: voteTx })
      } catch (e) {
        console.error(e)
        setIsUpvoting(false)
        return // Abort if tx fails
      }
      setIsUpvoting(false)
    }

    // Sync with DB
    try {
      await agentsAPI.vote(agent.agentId || agent.id || agent._id, type)
      setVoted(type)
    } catch (e) { console.error(e) }
  }

  const copyEndpoint = () => {
    navigator.clipboard.writeText(agent?.endpoint || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return <div className="p-6 max-w-6xl mx-auto"><LoadingPulse rows={8} /></div>
  
  if (!agent) return (
    <div className="relative min-h-[60vh] flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card-landing rounded-2xl p-10 text-center">
        <Zap size={40} className="mx-auto mb-4 text-[var(--color-purple-bright)] opacity-40" />
        <div className="text-[var(--color-text-muted)] text-lg font-display font-bold mb-2">AGENT NOT FOUND</div>
        <Link to="/marketplace" className="text-[var(--color-purple-bright)] text-xs font-mono hover:underline">← BACK TO MARKETPLACE</Link>
      </motion.div>
    </div>
  )

  return (
    <div className="relative min-h-screen">
      {/* Ambient glows */}
      <div className="fixed top-20 right-10 w-[500px] h-[400px] rounded-full pointer-events-none opacity-25" style={{ background: 'radial-gradient(ellipse, rgba(124,58,237,0.08) 0%, transparent 70%)' }} />
      <div className="fixed bottom-20 left-10 w-[400px] h-[300px] rounded-full pointer-events-none opacity-25" style={{ background: 'radial-gradient(ellipse, rgba(52,211,153,0.05) 0%, transparent 70%)' }} />

      <div className="relative z-10 p-5 lg:p-8 max-w-6xl mx-auto">
        <Link to="/marketplace">
          <motion.div whileHover={{ x: -4 }} className="inline-flex items-center gap-2 text-[var(--color-text-dim)] hover:text-[var(--color-purple-bright)] text-[11px] font-mono tracking-widest mb-6 transition-colors cursor-pointer group">
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> BACK TO MARKETPLACE
          </motion.div>
        </Link>

        {/* Agent Header */}
        <motion.div layoutId={`agent-bubble-${id}`} initial={{ opacity: 0, scale: 0.4, y: 40, borderRadius: '50%' }} animate={{ opacity: 1, scale: 1, y: 0, borderRadius: '16px' }} transition={{ type: 'spring', stiffness: 220, damping: 20, mass: 1 }} className="mb-8">
          <div className="glass-card-landing rounded-2xl p-6 sm:p-8 relative overflow-hidden shadow-[0_20px_60px_-15px_rgba(124,58,237,0.2)]">
            <div className="absolute top-0 right-0 w-[300px] h-[200px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(ellipse, rgba(124,58,237,0.15) 0%, transparent 70%)' }} />
            
            <div className="relative z-10 flex flex-col lg:flex-row items-start gap-6">
              <motion.div whileHover={{ scale: 1.05, rotate: 3 }} className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-[rgba(124,58,237,0.2)] to-[rgba(124,58,237,0.05)] border border-[rgba(124,58,237,0.3)] flex items-center justify-center shrink-0 shadow-[0_0_30px_rgba(124,58,237,0.15)]">
                <Cpu size={32} className="text-[var(--color-purple-bright)]" />
              </motion.div>
              
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <h1 className="font-display font-extrabold text-2xl sm:text-3xl lg:text-4xl text-[var(--color-text-primary)] tracking-tight">{agent.name}</h1>
                  <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(52,211,153,0.1)] border border-[rgba(52,211,153,0.25)]">
                    <span className="w-2 h-2 rounded-full bg-[var(--color-success)] pulse-dot" />
                    <span className="text-[10px] font-mono text-[var(--color-success)] tracking-widest font-bold">{(agent.status || 'ACTIVE').toUpperCase()}</span>
                  </motion.div>
                  {isBlockchain && (
                    <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(124,58,237,0.1)] border border-[rgba(124,58,237,0.25)]">
                      <Shield size={12} className="text-[var(--color-purple-bright)]" />
                      <span className="text-[10px] font-mono text-[var(--color-purple-bright)] tracking-widest font-bold">ON-CHAIN VERIFIED</span>
                    </motion.div>
                  )}
                </div>
                
                <p className="text-[var(--color-text-secondary)] text-sm sm:text-base mb-4 leading-relaxed max-w-2xl">{agent.description}</p>
                
                <div className="flex flex-wrap gap-2 mb-5">
                  {(agent.tags || []).map(tag => (
                    <motion.span key={tag} whileHover={{ scale: 1.05 }} className="px-3 py-1 rounded-lg text-[10px] font-mono bg-[rgba(124,58,237,0.06)] border border-[rgba(124,58,237,0.15)] text-[var(--color-purple-pale)] cursor-default">
                      #{tag}
                    </motion.span>
                  ))}
                </div>
                
                <div className="flex flex-wrap items-center gap-4 text-[10px] font-mono text-[var(--color-text-dim)]">
                  <span>OWNER: <span className="text-[var(--color-purple-bright)]">{agent.ownerWallet?.slice(0, 12) || '0xUNKNOWN'}...</span></span>
                  <span>CATEGORY: <span className="text-[var(--color-text-muted)]">{agent.category || 'N/A'}</span></span>
                </div>
              </div>
            </div>
            
            <div className="relative z-10 mt-6 flex items-center gap-3 p-3 rounded-xl bg-black/30 border border-[var(--color-border)] font-mono text-[11px] group">
              <ExternalLink size={13} className="text-[var(--color-text-dim)] shrink-0" />
              <span className="text-[var(--color-text-muted)] flex-1 truncate">{userHasAccess ? agent.endpoint : '******************************** (LOCKED)'}</span>
              {userHasAccess && (
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} onClick={copyEndpoint} className="text-[var(--color-text-dim)] hover:text-[var(--color-purple-bright)] transition-colors cursor-pointer p-1">
                  {copied ? <CheckCircle size={14} className="text-[var(--color-success)]" /> : <Copy size={14} />}
                </motion.button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Metrics Row */}
        <FadeInSection className="mb-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[
              { label: 'RATING', value: `${agent.rating || 0}/5.0`, color: 'yellow', icon: Star, gradient: 'from-amber-500/15 to-transparent' },
              { label: 'TOTAL CALLS', value: (agent.calls || 0).toLocaleString(), color: 'blue', icon: Activity, gradient: 'from-blue-500/15 to-transparent' },
              { label: 'SUCCESS RATE', value: `${agent.successRate || 0}%`, color: 'green', icon: TrendingUp, gradient: 'from-emerald-500/15 to-transparent' },
              { label: 'PRICE', value: `${agent.pricing || 0} AGT`, color: 'purple', icon: Shield, gradient: 'from-purple-500/15 to-transparent' },
            ].map((metric, i) => (
              <motion.div key={metric.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }} whileHover={{ scale: 1.02 }} className="group">
                <div className={`glass-card-landing rounded-xl p-4 sm:p-5 relative overflow-hidden transition-all duration-300`}>
                  <div className={`absolute inset-0 bg-gradient-to-br ${metric.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                  <div className="relative z-10"><MetricBadge {...metric} /></div>
                </div>
              </motion.div>
            ))}
          </div>
        </FadeInSection>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 lg:gap-6">
          {/* Main Panel — Execution OR Paywall */}
          <div className="lg:col-span-3 space-y-5">
            <FadeInSection delay={0.1}>
              <div className="glass-card-landing rounded-xl p-5 sm:p-6 min-h-[300px]">
                
                <AnimatePresence mode="wait">
                  {userHasAccess ? (
                    /* EXECUTION CONSOLE */
                    <motion.div key="execute" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                      <h2 className="font-display font-bold text-base sm:text-lg text-[var(--color-text-primary)] mb-5 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-[rgba(124,58,237,0.1)] border border-[rgba(124,58,237,0.2)] flex items-center justify-center">
                          <Terminal size={16} className="text-[var(--color-purple-bright)]" />
                        </div>
                        EXECUTION CONSOLE
                      </h2>
                      
                      <div className="mb-5">
                        <label className="text-[9px] font-mono text-[var(--color-text-dim)] tracking-[0.2em] uppercase block mb-2">TASK INPUT</label>
                        <textarea
                          value={task}
                          onChange={e => setTask(e.target.value)}
                          placeholder="Describe the task for this agent..."
                          rows={4}
                          className="input-field w-full px-4 py-3 rounded-xl text-sm resize-none focus:ring-2 focus:ring-[var(--color-purple-core)]/30 transition-all"
                        />
                      </div>
                      
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="text-[10px] font-mono text-[var(--color-text-dim)]">
                            STATUS: <span className="text-[var(--color-success)] font-bold text-sm">UNLOCKED</span>
                          </div>
                        </div>
                        <NeonButton icon={Send} onClick={handleExecute} loading={isExecuting} disabled={!isConnected || !task.trim()} className="w-full sm:w-auto">
                          {isConnected ? 'EXECUTE' : 'CONNECT WALLET'}
                        </NeonButton>
                      </div>

                      {/* Execution result output */}
                      {executionResult && (
                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className={`mt-5 p-5 rounded-xl border ${executionResult.success ? 'bg-[rgba(52,211,153,0.05)] border-[rgba(52,211,153,0.25)]' : 'bg-[rgba(248,113,113,0.05)] border-[rgba(248,113,113,0.25)]'}`}>
                          <div className="flex items-center gap-2 mb-3">
                            <CheckCircle size={15} className={executionResult.success ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'} />
                            <span className={`text-[11px] font-mono font-bold ${executionResult.success ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>EXECUTION {executionResult.success ? 'COMPLETE' : 'FAILED'}</span>
                            <span className="text-[var(--color-text-dim)] text-[10px] font-mono ml-auto flex items-center gap-1"><Clock size={10} /> {executionResult.latency}ms</span>
                          </div>
                          <pre className="text-[var(--color-text-muted)] text-[11px] font-mono whitespace-pre-wrap leading-relaxed bg-black/20 rounded-lg p-3">{executionResult.output}</pre>
                        </motion.div>
                      )}
                    </motion.div>
                  ) : (
                    /* PAYWALL / PURCHASE SCREEN */
                    <motion.div key="paywall" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center text-center py-6">
                      <div className="w-16 h-16 rounded-2xl bg-[rgba(124,58,237,0.1)] border border-[rgba(124,58,237,0.25)] flex items-center justify-center mb-6">
                        <Lock size={32} className="text-[var(--color-purple-bright)]" />
                      </div>
                      <h2 className="font-display font-bold text-2xl text-[var(--color-text-primary)] mb-2">ACCESS REQUIRED</h2>
                      <p className="text-[var(--color-text-muted)] text-sm max-w-sm mb-8">Purchase an on-chain license to unlock the endpoint and interact with this agent.</p>
                      
                      <div className="grid grid-cols-2 gap-4 w-full mb-8">
                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setPurchaseType('monthly')} className={`p-4 rounded-xl border text-center transition-all ${purchaseType === 'monthly' ? 'bg-[rgba(124,58,237,0.15)] border-[var(--color-purple-bright)] shadow-[0_0_20px_rgba(124,58,237,0.2)]' : 'border-[var(--color-border)] hover:border-[var(--color-border-bright)] bg-black/20'}`}>
                          <div className="text-[10px] font-mono tracking-widest text-[var(--color-text-dim)] mb-2">30 DAYS</div>
                          <div className="text-xl font-bold font-display text-[var(--color-purple-bright)]">{agent.pricing} <span className="text-xs">AGT</span></div>
                        </motion.button>

                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setPurchaseType('lifetime')} className={`p-4 rounded-xl border text-center transition-all ${purchaseType === 'lifetime' ? 'bg-[rgba(52,211,153,0.15)] border-[var(--color-success)] shadow-[0_0_20px_rgba(52,211,153,0.2)]' : 'border-[var(--color-border)] hover:border-[var(--color-border-bright)] bg-black/20'}`}>
                          <div className="text-[10px] font-mono tracking-widest text-[var(--color-text-dim)] mb-2">LIFETIME (x12)</div>
                          <div className="text-xl font-bold font-display text-[var(--color-success)]">{agent.pricing * 12} <span className="text-xs">AGT</span></div>
                        </motion.button>
                      </div>

                      <NeonButton icon={ShoppingCart} onClick={handlePurchase} loading={isPurchasing} disabled={!isConnected} className="w-full justify-center">
                        {isConnected ? `APPROVE & PURCHASE (${purchaseType.toUpperCase()})` : 'CONNECT WALLET TO PURCHASE'}
                      </NeonButton>
                    </motion.div>
                  )}
                </AnimatePresence>
                
              </div>
            </FadeInSection>
            
            <FadeInSection delay={0.2}>
              <TerminalBox logs={logs} title="SYSTEM LOGS" />
            </FadeInSection>
          </div>

          {/* Right panel */}
          <div className="lg:col-span-2 space-y-5">
            
            <FadeInSection delay={0.15}>
              <div className="glass-card-landing rounded-xl p-5 sm:p-6">
                <h3 className="font-mono text-[10px] tracking-[0.2em] text-[var(--color-text-dim)] uppercase mb-4 flex items-center gap-2">
                  <Sparkles size={12} className="text-[var(--color-purple-bright)]" />
                  CAPABILITIES
                </h3>
                <div className="space-y-2.5">
                  {['Natural Language Processing', 'Real-time Analysis', 'Multi-format Input', 'Streaming Output', 'Context Window 128K', 'Agent Composition'].map((cap, i) => (
                    <motion.div key={cap} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.05 }} className="flex items-center gap-2.5 text-xs text-[var(--color-text-muted)] cursor-default">
                      <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-purple-bright)] shrink-0" />
                      <span>{cap}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </FadeInSection>

            {/* Vote panel */}
            <FadeInSection delay={0.2}>
              <div className="glass-card-landing rounded-xl p-5 sm:p-6">
                <h3 className="font-mono text-[10px] tracking-[0.2em] text-[var(--color-text-dim)] uppercase mb-4">VOTE ON AGENT</h3>
                {isBlockchain && (
                  <p className="text-[9px] font-mono text-[var(--color-text-dim)] mb-3 leading-relaxed">
                    * Upvoting an on-chain agent transfers 1 AGT directly to the creator.
                  </p>
                )}
                <div className="flex gap-3">
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => handleVote('up')} disabled={isUpvoting} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border transition-all font-mono text-xs cursor-pointer ${voted === 'up' ? 'bg-[rgba(52,211,153,0.15)] border-[var(--color-success)] text-[var(--color-success)] shadow-[0_0_15px_rgba(52,211,153,0.2)]' : 'border-[var(--color-border)] text-[var(--color-text-dim)] hover:border-[rgba(52,211,153,0.4)] hover:text-[var(--color-success)]'}`}>
                    {isUpvoting ? <LoadingPulse rows={0} /> : <><ThumbsUp size={15} /> UPVOTE</>}
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => handleVote('down')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border transition-all font-mono text-xs cursor-pointer ${voted === 'down' ? 'bg-[rgba(248,113,113,0.15)] border-[var(--color-danger)] text-[var(--color-danger)] shadow-[0_0_15px_rgba(248,113,113,0.2)]' : 'border-[var(--color-border)] text-[var(--color-text-dim)] hover:border-[rgba(248,113,113,0.4)] hover:text-[var(--color-danger)]'}`}>
                    <ThumbsDown size={15} /> DOWNVOTE
                  </motion.button>
                </div>
              </div>
            </FadeInSection>

            {/* Performance stats */}
            <FadeInSection delay={0.25}>
              <div className="glass-card-landing rounded-xl p-5 sm:p-6">
                <h3 className="font-mono text-[10px] tracking-[0.2em] text-[var(--color-text-dim)] uppercase mb-5 flex items-center gap-2">
                  <Gauge size={12} className="text-[var(--color-star-blue)]" /> PERFORMANCE
                </h3>
                <div className="space-y-4">
                  {[
                    { label: 'Avg Latency', value: '234ms', bar: 80, color: 'from-blue-500 to-blue-400' },
                    { label: 'Uptime', value: '99.9%', bar: 99, color: 'from-emerald-500 to-emerald-400' },
                    { label: 'Error Rate', value: '0.3%', bar: 3, color: 'from-red-500 to-red-400' },
                  ].map((stat, i) => (
                    <div key={stat.label}>
                      <div className="flex justify-between text-[10px] font-mono mb-1.5">
                        <span className="text-[var(--color-text-dim)]">{stat.label}</span>
                        <span className="text-[var(--color-text-muted)] font-bold">{stat.value}</span>
                      </div>
                      <div className="h-1.5 bg-[var(--color-nebula-deep)] rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${stat.bar}%` }} transition={{ delay: 0.6 + i * 0.1, duration: 0.8 }} className={`h-full rounded-full bg-gradient-to-r ${stat.color}`} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </FadeInSection>
          </div>
        </div>
      </div>
    </div>
  )
}