import prisma from '../lib/prisma.js'
import config from '../config/config.js'

class AnalyticsService {
  /**
   * Calculate leaderboard score for an agent
   * score = 0.4×votes + 0.3×usage + 0.2×revenue + 0.1×successRate
   */
  calculateScore(agent, voteBalance) {
    const voteFactor = Math.max(0, Math.min(100, voteBalance)) * 0.4
    const usageFactor = Math.min(100, (agent.calls / 1000)) * 0.3
    const revenueFactor = Math.min(100, (agent.revenue / 100)) * 0.2
    const successFactor = agent.successRate * 0.1
    return parseFloat((voteFactor + usageFactor + revenueFactor + successFactor).toFixed(2))
  }

  /**
   * Update leaderboard scores for all agents
   */
  async updateLeaderboardScores() {
    const agents = await prisma.agent.findMany({
      where: { status: { not: 'inactive' } },
      include: {
        _count: { select: { votes: true } },
        votes: { select: { vote: true, weight: true } },
      },
    })

    const updates = agents.map(agent => {
      const upvotes = agent.votes
        .filter(v => v.vote === 'up')
        .reduce((s, v) => s + v.weight, 0)
      const downvotes = agent.votes
        .filter(v => v.vote === 'down')
        .reduce((s, v) => s + v.weight, 0)
      const voteBalance = upvotes - downvotes

      const score = this.calculateScore(agent, voteBalance)

      return prisma.agent.update({
        where: { id: agent.id },
        data: { score },
      })
    })

    await prisma.$transaction(updates)
    console.log(`[ANALYTICS] Updated scores for ${updates.length} agents`)
    return updates.length
  }

  /**
   * Get leaderboard
   */
  async getLeaderboard(limit = 50) {
    return prisma.agent.findMany({
      where: { status: { not: 'inactive' } },
      orderBy: { score: 'desc' },
      take: limit,
      include: {
        metrics: true,
        _count: { select: { votes: true, interactions: true } },
      },
    })
  }

  /**
   * Dashboard for a wallet owner
   */
  async getDashboard(walletAddress) {
    const wallet = walletAddress.toLowerCase()

    const [agents, transactions, recentInteractions, globalStats] = await prisma.$transaction([
      prisma.agent.findMany({
        where: { ownerWallet: wallet },
        include: { metrics: true },
      }),
      prisma.transaction.findMany({
        where: { ownerWallet: wallet, status: 'confirmed' },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      prisma.interaction.findMany({
        where: {
          agent: { ownerWallet: wallet },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { agent: { select: { name: true, agentId: true } } },
      }),
      prisma.globalStats.findUnique({ where: { id: 'global' } }),
    ])

    const totalRevenue = transactions.reduce((s, t) => s + (t.amount - t.platformFee), 0)
    const totalCalls = agents.reduce((s, a) => s + a.calls, 0)
    const avgSuccessRate = agents.length > 0
      ? agents.reduce((s, a) => s + a.successRate, 0) / agents.length
      : 0

    // Revenue by day (last 7 days)
    const revenueByDay = this._groupByDay(transactions, 7)

    return {
      summary: {
        totalRevenue: parseFloat(totalRevenue.toFixed(6)),
        totalCalls,
        agentCount: agents.length,
        activeAgents: agents.filter(a => a.status === 'active').length,
        avgSuccessRate: parseFloat(avgSuccessRate.toFixed(2)),
      },
      agents,
      revenueByDay,
      recentActivity: recentInteractions,
      globalStats,
    }
  }

  /**
   * Global platform statistics
   */
  async getGlobalStats() {
    const [stats, agentCounts, topCategory] = await prisma.$transaction([
      prisma.globalStats.findUnique({ where: { id: 'global' } }),
      prisma.agent.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      prisma.agent.groupBy({
        by: ['category'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5,
      }),
    ])

    return {
      ...stats,
      agentsByStatus: agentCounts.reduce((acc, row) => {
        acc[row.status] = row._count.id
        return acc
      }, {}),
      topCategories: topCategory.map(row => ({
        category: row.category,
        count: row._count.id,
      })),
    }
  }

  /**
   * Agent-level metrics
   */
  async getAgentMetrics(agentId) {
    const agent = await prisma.agent.findFirst({
      where: { OR: [{ id: agentId }, { agentId }] },
      include: {
        metrics: true,
        votes: { select: { vote: true, weight: true } },
        _count: { select: { interactions: true } },
      },
    })

    if (!agent) throw Object.assign(new Error('Agent not found'), { status: 404 })

    const upvotes = agent.votes.filter(v => v.vote === 'up').length
    const downvotes = agent.votes.filter(v => v.vote === 'down').length

    // Recent interactions (last 24h)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const recentInteractions = await prisma.interaction.findMany({
      where: { agentId: agent.id, createdAt: { gte: yesterday } },
      orderBy: { createdAt: 'desc' },
      select: { latency: true, status: true, createdAt: true },
    })

    const latencies = recentInteractions
      .filter(i => i.latency)
      .map(i => i.latency)

    const p50 = this._percentile(latencies, 50)
    const p95 = this._percentile(latencies, 95)
    const p99 = this._percentile(latencies, 99)

    return {
      agent,
      votes: { upvotes, downvotes, total: upvotes + downvotes },
      latencyPercentiles: { p50, p95, p99 },
      last24h: {
        calls: recentInteractions.length,
        successRate: recentInteractions.length
          ? (recentInteractions.filter(i => i.status === 'success').length / recentInteractions.length * 100).toFixed(2)
          : 100,
      },
    }
  }

  // ── Private helpers ────────────────────────────────────────

  _groupByDay(transactions, days) {
    const result = []
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)
      const next = new Date(date)
      next.setDate(next.getDate() + 1)

      const dayTxs = transactions.filter(t => {
        const d = new Date(t.createdAt)
        return d >= date && d < next
      })

      result.push({
        day: date.toLocaleDateString('en', { weekday: 'short' }),
        date: date.toISOString().split('T')[0],
        eth: parseFloat(dayTxs.reduce((s, t) => s + (t.amount - t.platformFee), 0).toFixed(6)),
        calls: dayTxs.length,
      })
    }
    return result
  }

  _percentile(sorted, p) {
    if (!sorted.length) return 0
    const arr = [...sorted].sort((a, b) => a - b)
    const idx = Math.ceil((p / 100) * arr.length) - 1
    return arr[Math.max(0, idx)]
  }
}

export default new AnalyticsService()