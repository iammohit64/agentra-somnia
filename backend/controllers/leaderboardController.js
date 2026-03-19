import prisma from '../lib/prisma.js'
import { asyncHandler } from '../middlewares/errorHandler.js'

// helper to safely convert wei string → number (for analytics only)
const weiToNumber = (wei) => {
  if (!wei) return 0
  return Number(wei) / 1e18
}

// ─────────────────────────────────────────────
// GET /api/leaderboard
// ─────────────────────────────────────────────
const getLeaderboard = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 100)
  const category = req.query.category || null

  const where = { status: { not: 'inactive' } }
  if (category && category !== 'all') {
    where.category = category
  }

  const agents = await prisma.agent.findMany({
    where,
    orderBy: { score: 'desc' },
    take: limit,
    include: {
      metrics: true,
      _count: {
        select: { interactions: true },
      },
    },
  })

  const leaderboard = agents.map((agent, index) => {
    const revenue = weiToNumber(agent.revenue)

    return {
      rank: index + 1,
      ...agent,
      votes: {
        upvotes: agent.upvotes || 0,
        total: agent.upvotes || 0,
      },
      scoreBreakdown: {
        voteComponent: parseFloat((0.4 * Math.min(100, agent.upvotes || 0)).toFixed(2)),
        usageComponent: parseFloat((0.3 * Math.min(100, agent.calls / 1000)).toFixed(2)),
        revenueComponent: parseFloat((0.2 * Math.min(100, revenue)).toFixed(2)),
        successComponent: parseFloat((0.1 * agent.successRate).toFixed(2)),
      },
    }
  })

  res.json({
    leaderboard,
    total: leaderboard.length,
    algorithm: 'score = 0.4×upvotes + 0.3×usage + 0.2×revenue + 0.1×successRate',
    generatedAt: new Date().toISOString(),
  })
})

// ─────────────────────────────────────────────
// GET /api/leaderboard/top/:n
// ─────────────────────────────────────────────
const getTopAgents = asyncHandler(async (req, res) => {
  const n = Math.min(parseInt(req.params.n) || 10, 50)

  const agents = await prisma.agent.findMany({
    where: { status: 'active' },
    orderBy: { score: 'desc' },
    take: n,
    select: {
      id: true,
      agentId: true,
      name: true,
      category: true,
      score: true,
      rating: true,
      calls: true,
      successRate: true,
      revenue: true,
      pricing: true,
      status: true,
      upvotes: true,
    },
  })

  res.json(agents.map((agent, i) => ({ rank: i + 1, ...agent })))
})

// ─────────────────────────────────────────────
// GET /api/leaderboard/category/:category
// ─────────────────────────────────────────────
const getLeaderboardByCategory = asyncHandler(async (req, res) => {
  const { category } = req.params
  const limit = Math.min(parseInt(req.query.limit) || 20, 50)

  const validCategories = ['Analysis', 'Development', 'Security', 'Data', 'NLP', 'Web3', 'Other']
  if (!validCategories.includes(category)) {
    return res.status(400).json({
      error: 'Invalid category',
      validCategories,
    })
  }

  const agents = await prisma.agent.findMany({
    where: { category, status: { not: 'inactive' } },
    orderBy: { score: 'desc' },
    take: limit,
    include: { metrics: true },
  })

  res.json({
    category,
    leaderboard: agents.map((a, i) => ({ rank: i + 1, ...a })),
    total: agents.length,
  })
})

// ─────────────────────────────────────────────
// POST /api/leaderboard/recalculate
// ─────────────────────────────────────────────
const recalculateScores = asyncHandler(async (req, res) => {
  const startTime = Date.now()

  const agents = await prisma.agent.findMany({
    where: { status: { not: 'inactive' } },
  })

  const updates = agents.map(agent => {
    const revenue = weiToNumber(agent.revenue)

    const voteFactor = Math.min(100, agent.upvotes || 0) * 0.4
    const usageFactor = Math.min(100, agent.calls / 1000) * 0.3
    const revenueFactor = Math.min(100, revenue) * 0.2
    const successFactor = agent.successRate * 0.1

    const score = parseFloat((voteFactor + usageFactor + revenueFactor + successFactor).toFixed(2))

    return prisma.agent.update({
      where: { id: agent.id },
      data: { score },
    })
  })

  await prisma.$transaction(updates)

  res.json({
    recalculated: updates.length,
    durationMs: Date.now() - startTime,
    timestamp: new Date().toISOString(),
  })
})

// ─────────────────────────────────────────────
// GET /api/leaderboard/agent/:id/rank
// ─────────────────────────────────────────────
const getAgentRank = asyncHandler(async (req, res) => {
  const { id } = req.params

  const isObjectId = /^[a-f\d]{24}$/i.test(id)
  const agent = await prisma.agent.findFirst({
    where: isObjectId
      ? { OR: [{ id }, { agentId: id }] }
      : { agentId: id },
  })

  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' })
  }

  const rank = await prisma.agent.count({
    where: {
      score: { gt: agent.score },
      status: { not: 'inactive' },
    },
  })

  const totalAgents = await prisma.agent.count({
    where: { status: { not: 'inactive' } },
  })

  res.json({
    agentId: agent.agentId,
    name: agent.name,
    rank: rank + 1,
    totalAgents,
    score: agent.score,
    percentile: parseFloat(((1 - rank / totalAgents) * 100).toFixed(1)),
  })
})

// ─────────────────────────────────────────────
// GET /api/leaderboard/stats
// ─────────────────────────────────────────────
const getLeaderboardStats = asyncHandler(async (req, res) => {
  const [
    totalActive,
    topAgent,
    agents,
    categoryBreakdown,
  ] = await prisma.$transaction([
    prisma.agent.count({ where: { status: 'active' } }),
    prisma.agent.findFirst({
      where: { status: { not: 'inactive' } },
      orderBy: { score: 'desc' },
      select: { name: true, agentId: true, score: true, category: true },
    }),
    prisma.agent.findMany({
      where: { status: 'active' },
      select: {
        score: true,
        successRate: true,
        pricing: true,
        revenue: true,
        calls: true,
      },
    }),
    prisma.agent.groupBy({
      by: ['category'],
      where: { status: 'active' },
      _count: { id: true },
      _avg: { score: true },
      orderBy: { _count: { id: 'desc' } },
    }),
  ])

  const avgScore = agents.reduce((s, a) => s + a.score, 0) / (agents.length || 1)
  const avgSuccess = agents.reduce((s, a) => s + a.successRate, 0) / (agents.length || 1)
  const avgRevenue = agents.reduce((s, a) => s + weiToNumber(a.revenue), 0) / (agents.length || 1)
  const totalCalls = agents.reduce((s, a) => s + a.calls, 0)

  res.json({
    totalActive,
    topAgent,
    platformAverages: {
      score: parseFloat(avgScore.toFixed(2)),
      successRate: parseFloat(avgSuccess.toFixed(2)),
      revenue: parseFloat(avgRevenue.toFixed(4)),
    },
    totals: {
      calls: totalCalls,
      revenue: parseFloat(avgRevenue.toFixed(4)),
    },
    categoryBreakdown: categoryBreakdown.map(c => ({
      category: c.category,
      count: c._count.id,
      avgScore: parseFloat((c._avg.score || 0).toFixed(2)),
    })),
    generatedAt: new Date().toISOString(),
  })
})

export {
  getLeaderboard,
  getTopAgents,
  getLeaderboardByCategory,
  recalculateScores,
  getAgentRank,
  getLeaderboardStats,
}