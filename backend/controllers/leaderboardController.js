import prisma from '../lib/prisma.js'
import analyticsService from '../services/analyticsService.js'
import contractManager from '../blockchain/contracts.js'
import { asyncHandler } from '../middlewares/errorHandler.js'

// ─────────────────────────────────────────────────────────────
// GET /api/leaderboard
// Full leaderboard with rank positions
// ─────────────────────────────────────────────────────────────
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
        select: { votes: true, interactions: true },
      },
    },
  })

  const leaderboard = await Promise.all(
    agents.map(async (agent, index) => {
      const [upvotes, downvotes] = await prisma.$transaction([
        prisma.vote.count({ where: { agentId: agent.id, vote: 'up' } }),
        prisma.vote.count({ where: { agentId: agent.id, vote: 'down' } }),
      ])

      return {
        rank: index + 1,
        ...agent,
        votes: {
          upvotes,
          downvotes,
          total: upvotes + downvotes,
          balance: upvotes - downvotes,
        },
        scoreBreakdown: {
          voteComponent: parseFloat((0.4 * Math.max(0, Math.min(100, upvotes - downvotes))).toFixed(2)),
          usageComponent: parseFloat((0.3 * Math.min(100, agent.calls / 1000)).toFixed(2)),
          revenueComponent: parseFloat((0.2 * Math.min(100, agent.revenue / 100)).toFixed(2)),
          successComponent: parseFloat((0.1 * agent.successRate).toFixed(2)),
        },
      }
    })
  )

  res.json({
    leaderboard,
    total: leaderboard.length,
    algorithm: 'score = 0.4×votes + 0.3×usage + 0.2×revenue + 0.1×successRate',
    generatedAt: new Date().toISOString(),
  })
})

// ─────────────────────────────────────────────────────────────
// GET /api/leaderboard/top/:n
// ─────────────────────────────────────────────────────────────
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
    },
  })

  res.json(agents.map((agent, i) => ({ rank: i + 1, ...agent })))
})

// ─────────────────────────────────────────────────────────────
// GET /api/leaderboard/category/:category
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
// POST /api/leaderboard/recalculate
// ─────────────────────────────────────────────────────────────
const recalculateScores = asyncHandler(async (req, res) => {
  const startTime = Date.now()

  const agents = await prisma.agent.findMany({
    where: { status: { not: 'inactive' } },
    include: {
      votes: { select: { vote: true, weight: true } },
    },
  })

  const updates = agents.map(agent => {
    const upvotes = agent.votes.filter(v => v.vote === 'up').reduce((s, v) => s + v.weight, 0)
    const downvotes = agent.votes.filter(v => v.vote === 'down').reduce((s, v) => s + v.weight, 0)
    const voteBalance = upvotes - downvotes

    const voteFactor = Math.max(0, Math.min(100, voteBalance)) * 0.4
    const usageFactor = Math.min(100, agent.calls / 1000) * 0.3
    const revenueFactor = Math.min(100, agent.revenue / 100) * 0.2
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

// ─────────────────────────────────────────────────────────────
// GET /api/leaderboard/agent/:id/rank
// ─────────────────────────────────────────────────────────────
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

  const [above, below] = await prisma.$transaction([
    prisma.agent.findMany({
      where: {
        score: { gt: agent.score },
        status: { not: 'inactive' },
      },
      orderBy: { score: 'asc' },
      take: 2,
      select: { id: true, name: true, score: true, agentId: true },
    }),
    prisma.agent.findMany({
      where: {
        score: { lt: agent.score },
        status: { not: 'inactive' },
      },
      orderBy: { score: 'desc' },
      take: 2,
      select: { id: true, name: true, score: true, agentId: true },
    }),
  ])

  res.json({
    agentId: agent.agentId,
    name: agent.name,
    rank: rank + 1,
    totalAgents,
    score: agent.score,
    percentile: parseFloat(((1 - rank / totalAgents) * 100).toFixed(1)),
    neighbors: {
      above: above.reverse().map((a, i) => ({ ...a, rank: rank - i })),
      below: below.map((a, i) => ({ ...a, rank: rank + 2 + i })),
    },
  })
})

// ─────────────────────────────────────────────────────────────
// GET /api/leaderboard/stats
// ─────────────────────────────────────────────────────────────
const getLeaderboardStats = asyncHandler(async (req, res) => {
  const [
    totalActive,
    topAgent,
    avgMetrics,
    categoryBreakdown,
    recentlyRisen,
  ] = await prisma.$transaction([
    prisma.agent.count({ where: { status: 'active' } }),
    prisma.agent.findFirst({
      where: { status: { not: 'inactive' } },
      orderBy: { score: 'desc' },
      select: { name: true, agentId: true, score: true, category: true },
    }),
    prisma.agent.aggregate({
      where: { status: 'active' },
      _avg: {
        score: true,
        rating: true,
        successRate: true,
        pricing: true,
      },
      _sum: {
        calls: true,
        revenue: true,
      },
    }),
    prisma.agent.groupBy({
      by: ['category'],
      where: { status: 'active' },
      _count: { id: true },
      _avg: { score: true, rating: true },
      orderBy: { _count: { id: 'desc' } },
    }),
    prisma.interaction.groupBy({
      by: ['agentId'],
      where: {
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        status: 'success',
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    }),
  ])

  const risingAgentIds = recentlyRisen.map(r => r.agentId)
  const risingAgents = await prisma.agent.findMany({
    where: { id: { in: risingAgentIds } },
    select: { id: true, name: true, agentId: true, score: true, category: true },
  })

  const risingWithCount = recentlyRisen.map(r => {
    const agent = risingAgents.find(a => a.id === r.agentId)
    return { ...agent, callsLast24h: r._count.id }
  }).filter(Boolean)

  res.json({
    totalActive,
    topAgent,
    platformAverages: {
      score: parseFloat((avgMetrics._avg.score || 0).toFixed(2)),
      rating: parseFloat((avgMetrics._avg.rating || 0).toFixed(2)),
      successRate: parseFloat((avgMetrics._avg.successRate || 0).toFixed(2)),
      pricing: parseFloat((avgMetrics._avg.pricing || 0).toFixed(4)),
    },
    totals: {
      calls: avgMetrics._sum.calls || 0,
      revenue: parseFloat((avgMetrics._sum.revenue || 0).toFixed(4)),
    },
    categoryBreakdown: categoryBreakdown.map(c => ({
      category: c.category,
      count: c._count.id,
      avgScore: parseFloat((c._avg.score || 0).toFixed(2)),
      avgRating: parseFloat((c._avg.rating || 0).toFixed(2)),
    })),
    trendingAgents: risingWithCount,
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