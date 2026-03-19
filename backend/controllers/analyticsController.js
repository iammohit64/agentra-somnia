import prisma from '../lib/prisma.js'
import analyticsService from '../services/analyticsService.js'
import { asyncHandler } from '../middlewares/errorHandler.js'

const getLeaderboard = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 100)
  const leaderboard = await analyticsService.getLeaderboard(limit)
  res.json(leaderboard)
})

const getDashboard = asyncHandler(async (req, res) => {
  const wallet = req.walletAddress
  const data = await analyticsService.getDashboard(wallet)
  res.json(data)
})

// Completely dynamic: computes true totals from DB on the fly
const getGlobalStats = asyncHandler(async (req, res) => {
  const [
    totalAgents,
    activeAgents,
    interactionsCount,
    transactions,
    avgMetrics
  ] = await prisma.$transaction([
    prisma.agent.count(),
    prisma.agent.count({ where: { status: 'active' } }),
    prisma.interaction.count(),
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { status: 'confirmed' }
    }),
    prisma.agent.aggregate({
      _avg: { successRate: true }
    })
  ])

  res.json({
    totalAgents,
    activeAgents,
    totalCalls: interactionsCount,
    totalRevenue: transactions._sum.amount || 0,
    avgSuccessRate: avgMetrics._avg.successRate || 100
  })
})

const getAgentMetrics = asyncHandler(async (req, res) => {
  const metrics = await analyticsService.getAgentMetrics(req.params.id)
  res.json(metrics)
})

export { getLeaderboard, getDashboard, getGlobalStats, getAgentMetrics }