import { PrismaClient, AgentCategory, AgentStatus } from '@prisma/client'

const prisma = new PrismaClient()

const SEED_WALLETS = [
  '0xabcdef1234567890abcdef1234567890abcdef12',
  '0xdef0123456789abcdef0123456789abcdef01234',
  '0x9876543210abcdef9876543210abcdef98765432',
]

const SEED_AGENTS = [
  {
    name: 'DataSynth-7',
    category: AgentCategory.Analysis,
    description: 'Advanced data synthesis and pattern recognition agent with neural processing capabilities.',
    endpoint: 'https://api.datasynth.ai',
    pricing: 0.05,
    status: AgentStatus.active,
    rating: 4.8,
    ratingCount: 312,
    calls: 12847,
    successRate: 99.2,
    revenue: 642.35,
    tags: ['data', 'analysis', 'ml'],
    score: 87.4,
    ownerWallet: SEED_WALLETS[0],
  },
  {
    name: 'CodeForge-X',
    category: AgentCategory.Development,
    description: 'Autonomous code generation, review and optimization agent. Supports 40+ languages.',
    endpoint: 'https://api.codeforge.dev',
    pricing: 0.08,
    status: AgentStatus.active,
    rating: 4.9,
    ratingCount: 891,
    calls: 28341,
    successRate: 97.8,
    revenue: 2267.28,
    tags: ['code', 'dev', 'automation'],
    score: 94.1,
    ownerWallet: SEED_WALLETS[1],
  },
  {
    name: 'NeuralVault',
    category: AgentCategory.Security,
    description: 'On-chain security analysis, smart contract auditing, and threat detection agent.',
    endpoint: 'https://api.neuralvault.io',
    pricing: 0.12,
    status: AgentStatus.active,
    rating: 4.7,
    ratingCount: 204,
    calls: 5621,
    successRate: 98.5,
    revenue: 674.52,
    tags: ['security', 'audit', 'web3'],
    score: 82.7,
    ownerWallet: SEED_WALLETS[2],
  },
  {
    name: 'OracleStream',
    category: AgentCategory.Data,
    description: 'Real-time market data aggregation and prediction agent with cross-chain oracle integration.',
    endpoint: 'https://api.oraclestream.net',
    pricing: 0.03,
    status: AgentStatus.active,
    rating: 4.6,
    ratingCount: 1043,
    calls: 43201,
    successRate: 99.7,
    revenue: 1296.03,
    tags: ['oracle', 'defi', 'data'],
    score: 91.2,
    ownerWallet: SEED_WALLETS[0],
  },
  {
    name: 'SynthLang-3',
    category: AgentCategory.NLP,
    description: 'Multi-modal language synthesis and summarization with context window of 1M tokens.',
    endpoint: 'https://api.synthlang.ai',
    pricing: 0.04,
    status: AgentStatus.active,
    rating: 4.5,
    ratingCount: 567,
    calls: 19005,
    successRate: 96.3,
    revenue: 760.2,
    tags: ['nlp', 'translation', 'text'],
    score: 79.3,
    ownerWallet: SEED_WALLETS[1],
  },
  {
    name: 'ChainMind',
    category: AgentCategory.Web3,
    description: 'Autonomous DeFi strategy agent — yield optimization, liquidity management, risk assessment.',
    endpoint: 'https://api.chainmind.finance',
    pricing: 0.15,
    status: AgentStatus.busy,
    rating: 4.9,
    ratingCount: 389,
    calls: 8902,
    successRate: 98.1,
    revenue: 1335.3,
    tags: ['defi', 'yield', 'web3'],
    score: 96.8,
    ownerWallet: SEED_WALLETS[2],
  },
]

async function main() {
  console.log('🌱 Seeding database...')

  for (const wallet of SEED_WALLETS) {
    await prisma.user.upsert({
      where: { walletAddress: wallet },
      update: {},
      create: { walletAddress: wallet },
    })
    console.log(`  ✅ User: ${wallet.slice(0, 10)}...`)
  }

  for (const agentData of SEED_AGENTS) {
    const agent = await prisma.agent.upsert({
      where: { name: agentData.name },
      update: agentData,
      create: agentData,
    })

    await prisma.usageMetrics.upsert({
      where: { agentId: agent.id },
      update: {
        calls: agent.calls,
        successRate: agent.successRate,
        revenue: agent.revenue,
        avgLatency: Math.floor(Math.random() * 300 + 100),
      },
      create: {
        agentId: agent.id,
        calls: agent.calls,
        successRate: agent.successRate,
        revenue: agent.revenue,
        avgLatency: Math.floor(Math.random() * 300 + 100),
      },
    })

    console.log(`  ✅ Agent: ${agent.name}`)
  }

  await prisma.globalStats.upsert({
    where: { id: 'global' },
    update: {
      totalAgents: SEED_AGENTS.length,
      activeAgents: SEED_AGENTS.filter(a => a.status === 'active').length,
      totalCalls: SEED_AGENTS.reduce((s, a) => s + a.calls, 0),
      totalRevenue: SEED_AGENTS.reduce((s, a) => s + a.revenue, 0),
    },
    create: {
      id: 'global',
      totalAgents: SEED_AGENTS.length,
      activeAgents: SEED_AGENTS.filter(a => a.status === 'active').length,
      totalCalls: SEED_AGENTS.reduce((s, a) => s + a.calls, 0),
      totalRevenue: SEED_AGENTS.reduce((s, a) => s + a.revenue, 0),
    },
  })

  console.log('\n✅ Seed complete!')
}

main()
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })