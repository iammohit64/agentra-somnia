import React, { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import StarField from '../components/ui/StarField'
import { motion, useInView } from 'framer-motion'
import {
  Cpu, Zap, Shield, BarChart3, Globe, Upload,
  ArrowRight, ChevronRight, Activity,
  Layers, Lock, Rocket, Code2,
} from 'lucide-react'
import { analyticsAPI } from '../api/analytics'

/* ── Fade-in wrapper (triggers when scrolled into view) ── */
function FadeInSection({ children, className = '', delay = 0 }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-60px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/* ── Data ── */
const FEATURES = [
  {
    icon: Zap,
    title: 'Instant Execution',
    description: 'Execute AI agents on-demand with sub-second routing. Pay-per-call pricing keeps costs transparent.',
  },
  {
    icon: Shield,
    title: 'Trustless & Secure',
    description: 'On-chain smart contracts ensure immutable ownership, transparent payments, and verifiable execution logs.',
  },
  {
    icon: Globe,
    title: 'MCP Protocol',
    description: 'Standardized Model Context Protocol endpoints enable seamless agent composition and interoperability.',
  },
  {
    icon: BarChart3,
    title: 'Real-time Analytics',
    description: 'Track revenue, usage, and performance metrics across all your deployed agents from a single dashboard.',
  },
  {
    icon: Layers,
    title: 'Agent Composition',
    description: 'Chain multiple agents together to build complex workflows. One agent\'s output becomes another\'s input.',
  },
  {
    icon: Lock,
    title: 'Wallet Identity',
    description: 'Your wallet is your identity. Deploy, execute, and earn — all tied to your on-chain address.',
  },
]

const STEPS = [
  {
    num: '01',
    icon: Upload,
    title: 'Deploy Your Agent',
    description: 'Configure your AI agent with an MCP endpoint, set pricing, and publish to the marketplace in minutes.',
  },
  {
    num: '02',
    icon: Globe,
    title: 'Get Discovered',
    description: 'Your agent appears in the marketplace where developers can search, filter, and evaluate capabilities.',
  },
  {
    num: '03',
    icon: Activity,
    title: 'Earn Per Execution',
    description: 'Every time someone executes your agent, you earn ETH. Revenue flows directly to your wallet.',
  },
  {
    num: '04',
    icon: BarChart3,
    title: 'Scale & Optimize',
    description: 'Monitor analytics, climb the leaderboard, and optimize based on real usage data and community votes.',
  },
]

export default function LandingPage() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    analyticsAPI.getGlobalStats()
      .then(res => setStats(res.data))
      .catch(console.error)
  }, [])

  // Dynamic stats calculated from the backend
const STATS = [
  { value: 'MCP', label: 'Native Protocol' },
  { value: 'ETH', label: 'Base Settlement' },
  { value: 'IPFS', label: 'Decentralized Storage' },
  { value: 'V1.0', label: 'Network Status' },
]

  return (
    <div className="relative min-h-screen bg-black overflow-hidden">
      {/* Star background */}
      <StarField />
      {/* ── HERO SECTION ── */}
      <section className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 text-center">
        {/* Ambient glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, rgba(124,58,237,0.08) 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 left-0 w-[400px] h-[300px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, rgba(147,51,234,0.04) 0%, transparent 70%)' }} />

        {/* Dynamic Badge */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[rgba(124,58,237,0.25)] bg-[rgba(124,58,237,0.06)] mb-8"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)] pulse-dot" />
          <span className="text-[11px] font-mono text-[var(--color-purple-pale)] tracking-[0.2em]">
            NETWORK LIVE — {stats?.activeAgents || 0} AGENTS ONLINE
          </span>
        </motion.div>

        {/* Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="hero-title flex flex-col items-center font-display font-extrabold text-5xl sm:text-6xl md:text-7xl lg:text-8xl text-[var(--color-text-primary)] leading-[1.05] tracking-tight max-w-5xl"
        >
          <span className="type-line line-1">The Neural</span>
          <span className="gradient-text-purple type-line line-2">Marketplace</span>
          <span className="type-line line-3">for AI Agents</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-6 text-[var(--color-text-secondary)] text-base sm:text-lg max-w-2xl leading-relaxed font-body"
        >
          Deploy, discover, and execute autonomous AI agents on a decentralized marketplace.
          Powered by MCP protocol, secured by smart contracts, driven by community intelligence.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-4 mt-10"
        >
          <Link to="/marketplace">
            <button className="btn-glow px-8 py-3.5 rounded-xl inline-flex items-center gap-2.5 cursor-pointer">
              <Rocket size={16} />
              EXPLORE AGENTS
              <ArrowRight size={14} />
            </button>
          </Link>
          <Link to="/deploy">
            <button className="btn-outline-glow px-8 py-3.5 rounded-xl inline-flex items-center gap-2.5 cursor-pointer">
              <Code2 size={16} />
              DEPLOY YOURS
            </button>
          </Link>
        </motion.div>

        {/* Dynamic Stats row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.9 }}
          className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-12"
        >
          {STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 + i * 0.1 }}
              className="text-center"
            >
              <div className="font-display font-bold text-2xl sm:text-3xl text-[var(--color-text-primary)]">{stat.value}</div>
              <div className="text-[10px] font-mono text-[var(--color-text-muted)] tracking-[0.2em] mt-1 uppercase">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2"
        >
          <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 2, repeat: Infinity }}>
            <ChevronRight size={20} className="rotate-90 text-[var(--color-text-dim)]" />
          </motion.div>
        </motion.div>
      </section>

      {/* ── FEATURES SECTION ── */}
      <section className="relative z-10 py-24 sm:py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <FadeInSection className="text-center mb-16">
            <span className="text-[10px] font-mono text-[var(--color-purple-bright)] tracking-[0.3em] uppercase">Platform Capabilities</span>
            <h2 className="font-display font-extrabold text-3xl sm:text-4xl lg:text-5xl text-[var(--color-text-primary)] mt-3 leading-tight">
              Built for the Agent Economy
            </h2>
            <p className="text-[var(--color-text-secondary)] text-sm sm:text-base max-w-xl mx-auto mt-4">
              Everything you need to deploy, monetize, and scale autonomous AI agents.
            </p>
          </FadeInSection>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((feature, i) => {
              const Icon = feature.icon
              return (
                <FadeInSection key={feature.title} delay={i * 0.08}>
                  <div className="glass-card-landing rounded-xl p-6 h-full">
                    <div className="w-10 h-10 rounded-lg bg-[rgba(124,58,237,0.08)] border border-[rgba(124,58,237,0.2)] flex items-center justify-center mb-4">
                      <Icon size={18} className="text-[var(--color-purple-bright)]" />
                    </div>
                    <h3 className="font-display font-bold text-base text-[var(--color-text-primary)] mb-2">{feature.title}</h3>
                    <p className="text-[var(--color-text-muted)] text-sm leading-relaxed">{feature.description}</p>
                  </div>
                </FadeInSection>
              )
            })}
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="section-divider max-w-4xl mx-auto" />

      {/* ── HOW IT WORKS ── */}
      <section className="relative z-10 py-24 sm:py-32 px-6">
        <div className="max-w-5xl mx-auto">
          <FadeInSection className="text-center mb-16">
            <span className="text-[10px] font-mono text-[var(--color-purple-bright)] tracking-[0.3em] uppercase">How It Works</span>
            <h2 className="font-display font-extrabold text-3xl sm:text-4xl lg:text-5xl text-[var(--color-text-primary)] mt-3 leading-tight">
              From Code to Revenue in Minutes
            </h2>
          </FadeInSection>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {STEPS.map((step, i) => {
              const Icon = step.icon
              return (
                <FadeInSection key={step.num} delay={i * 0.1}>
                  <div className="glass-card-landing rounded-xl p-6 flex gap-5">
                    <div className="shrink-0">
                      <div className="w-12 h-12 rounded-xl bg-[rgba(124,58,237,0.06)] border border-[rgba(124,58,237,0.15)] flex items-center justify-center relative">
                        <Icon size={20} className="text-[var(--color-purple-bright)]" />
                        <span className="absolute -top-2 -right-2 text-[9px] font-mono font-bold text-[var(--color-purple-pale)] bg-[rgba(124,58,237,0.15)] border border-[rgba(124,58,237,0.3)] rounded-full w-5 h-5 flex items-center justify-center">
                          {step.num}
                        </span>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-base text-[var(--color-text-primary)] mb-1.5">{step.title}</h3>
                      <p className="text-[var(--color-text-muted)] text-sm leading-relaxed">{step.description}</p>
                    </div>
                  </div>
                </FadeInSection>
              )
            })}
          </div>

          {/* CTA after steps */}
          <FadeInSection delay={0.4} className="text-center mt-14">
            <Link to="/deploy">
              <button className="btn-glow px-10 py-4 rounded-xl inline-flex items-center gap-3 text-sm cursor-pointer">
                <Upload size={16} />
                START DEPLOYING
                <ArrowRight size={14} />
              </button>
            </Link>
          </FadeInSection>
        </div>
      </section>

      {/* Divider */}
      <div className="section-divider max-w-4xl mx-auto" />

      {/* ── ABOUT / WHY AGENTRA ── */}
      <section className="relative z-10 py-24 sm:py-32 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <FadeInSection>
            <span className="text-[10px] font-mono text-[var(--color-purple-bright)] tracking-[0.3em] uppercase">Why Agentra</span>
            <h2 className="font-display font-extrabold text-3xl sm:text-4xl lg:text-5xl text-[var(--color-text-primary)] mt-3 leading-tight">
              The Future of Autonomous AI
            </h2>
            <p className="text-[var(--color-text-secondary)] text-sm sm:text-base max-w-2xl mx-auto mt-6 leading-relaxed">
              Agentra is the decentralized infrastructure layer for autonomous AI agents.
              We provide the marketplace, protocol, and tooling that lets developers deploy intelligent agents
              and earn revenue from every execution — transparently, securely, and at scale.
            </p>
            <p className="text-[var(--color-text-muted)] text-sm max-w-2xl mx-auto mt-4 leading-relaxed">
              Whether you're building data analysis pipelines, code generation tools, security auditors,
              or DeFi strategy agents — Agentra gives your creation a home, an audience, and a revenue stream.
            </p>
          </FadeInSection>

          {/* Tech badges */}
          <FadeInSection delay={0.2} className="flex flex-wrap justify-center gap-3 mt-10">
            {['MCP Protocol', 'Ethereum', 'Smart Contracts', 'Pay-per-Call', 'Open Source', 'Community Governed'].map(tag => (
              <span
                key={tag}
                className="px-4 py-2 rounded-lg border border-[rgba(124,58,237,0.15)] bg-[rgba(124,58,237,0.04)] text-[11px] font-mono text-[var(--color-purple-pale)] tracking-[0.1em]"
              >
                {tag}
              </span>
            ))}
          </FadeInSection>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="relative z-10 py-24 sm:py-32 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <FadeInSection>
            <div className="glass-card-landing rounded-2xl p-10 sm:p-14 relative overflow-hidden">
              {/* Ambient glow inside card */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(ellipse, rgba(124,58,237,0.12) 0%, transparent 70%)' }} />

              <div className="relative z-10">
                <Cpu size={36} className="mx-auto text-[var(--color-purple-bright)] mb-5 opacity-70" />
                <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-[var(--color-text-primary)] leading-tight">
                  Ready to Launch?
                </h2>
                <p className="text-[var(--color-text-secondary)] text-sm sm:text-base mt-4 mb-8 max-w-lg mx-auto">
                  Join hundreds of developers already earning from their AI agents on Agentra.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link to="/marketplace">
                    <button className="btn-glow px-8 py-3.5 rounded-xl inline-flex items-center gap-2.5 cursor-pointer">
                      EXPLORE MARKETPLACE
                      <ArrowRight size={14} />
                    </button>
                  </Link>
                  <Link to="/deploy">
                    <button className="btn-outline-glow px-8 py-3.5 rounded-xl inline-flex items-center gap-2.5 cursor-pointer">
                      DEPLOY AGENT
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          </FadeInSection>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="relative z-10 border-t border-[var(--color-border)] py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--color-nebula)] border border-[var(--color-border-bright)] flex items-center justify-center">
              <Cpu size={15} className="text-[var(--color-purple-bright)]" />
            </div>
            <div>
              <div className="font-display font-bold text-sm text-[var(--color-text-primary)] tracking-[0.15em]">AGENTRA</div>
              <div className="font-mono text-[9px] text-[var(--color-text-dim)] tracking-[0.3em]">NEURAL MARKETPLACE</div>
            </div>
          </div>

          <div className="flex items-center gap-8">
            <Link to="/marketplace" className="text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] text-xs font-mono tracking-widest transition-colors">
              MARKETPLACE
            </Link>
            <Link to="/deploy" className="text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] text-xs font-mono tracking-widest transition-colors">
              DEPLOY
            </Link>
            <Link to="/leaderboard" className="text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] text-xs font-mono tracking-widest transition-colors">
              LEADERBOARD
            </Link>
          </div>

          <div className="text-[var(--color-text-dim)] text-[10px] font-mono tracking-widest">
            © 2026 AGENTRA
          </div>
        </div>
      </footer>
    </div>
  )
}