import prisma from '../lib/prisma.js'
import { v4 as uuidv4 } from 'uuid'
import axios from 'axios'

class AgentService {
  /**
   * Create and register a new agent
   */
  async createAgent(data, ownerWallet) {
    const {
      name,
      description,
      endpoint = '',      // optional for database-only deploys
      category,
      tags = [],
      pricing,
      mcpSchema,
      deployMode = 'blockchain',  // passed through so it can be stored / logged
    } = data

    const agent = await prisma.agent.create({
      data: {
        agentId: `AGT-${uuidv4().slice(0, 8).toUpperCase()}`,
        name,
        description,
        endpoint,
        category,
        tags,
        pricing: parseFloat(pricing),
        mcpSchema: mcpSchema || null,
        ownerWallet: ownerWallet.toLowerCase(),
        status: 'active',
      },
      include: { metrics: true },
    })

    // Create initial metrics row
    await prisma.usageMetrics.create({
      data: { agentId: agent.id },
    })

    // Update global stats
    await prisma.globalStats.upsert({
      where: { id: 'global' },
      update: { totalAgents: { increment: 1 }, activeAgents: { increment: 1 } },
      create: { id: 'global', totalAgents: 1, activeAgents: 1 },
    })

    console.log(`[AGENT SERVICE] Created agent "${name}" (${deployMode}) for wallet ${ownerWallet.slice(0, 10)}...`)

    return agent
  }

  /**
   * Validate that an endpoint is reachable
   */
  async validateEndpoint(endpoint) {
    // Guard against empty/missing endpoint
    if (!endpoint) {
      return { valid: false, error: 'No endpoint provided' }
    }

    const urls = [
      `${endpoint}/health`,
      `${endpoint}/ping`,
      endpoint,
    ]

    for (const url of urls) {
      try {
        const res = await axios.get(url, {
          timeout: 5000,
          validateStatus: (s) => s < 500,
        })
        return { valid: true, status: res.status, url }
      } catch {
        continue
      }
    }

    return { valid: false, error: 'Endpoint unreachable after 3 attempts' }
  }

  /**
   * Get paginated + filtered agents
   */
  async getAgents({
    category,
    search,
    status,
    sortBy = 'score',
    page = 1,
    limit = 20,
    ownerWallet,
  } = {}) {
    const where = {}

    if (status && status !== 'all') {
      where.status = status
    } else {
      where.status = { not: 'inactive' }
    }

    if (category && category !== 'all') where.category = category
    if (ownerWallet) where.ownerWallet = ownerWallet
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { tags: { has: search.toLowerCase() } },
      ]
    }

    const orderByMap = {
      score: { score: 'desc' },
      rating: { rating: 'desc' },
      calls: { calls: 'desc' },
      newest: { createdAt: 'desc' },
      'price-low': { pricing: 'asc' },
      'price-high': { pricing: 'desc' },
    }

    const orderBy = orderByMap[sortBy] || orderByMap.score

    const [agents, total] = await prisma.$transaction([
      prisma.agent.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          metrics: true,
          _count: { select: { votes: true, interactions: true } },
        },
      }),
      prisma.agent.count({ where }),
    ])

    return {
      agents,
      total,
      page,
      pages: Math.ceil(total / limit),
      limit,
    }
  }

  /**
   * Get single agent by ID or agentId
   */
 async getById(id) {
  // Determine if id is a MongoDB ObjectId (24 hex chars) or custom agentId (AGT-XXXXXXXX)
  const isObjectId = /^[a-f\d]{24}$/i.test(id)

  const agent = await prisma.agent.findFirst({
    where: isObjectId
      ? { OR: [{ id }, { agentId: id }] }
      : { agentId: id },
    include: {
      metrics: true,
      _count: { select: { votes: true, interactions: true } },
    },
  })
  if (!agent) throw Object.assign(new Error('Agent not found'), { status: 404 })
  return agent
}

  /**
   * Update agent (owner only)
   */
  async updateAgent(id, updates, wallet) {
    const agent = await prisma.agent.findFirst({
      where: { OR: [{ id }, { agentId: id }] },
    })
    if (!agent) throw Object.assign(new Error('Agent not found'), { status: 404 })
    if (agent.ownerWallet !== wallet.toLowerCase()) {
      throw Object.assign(new Error('Not authorized'), { status: 403 })
    }

    const allowed = ['name', 'description', 'endpoint', 'pricing', 'tags', 'mcpSchema', 'category']
    const safeUpdates = Object.fromEntries(
      Object.entries(updates).filter(([k]) => allowed.includes(k))
    )

    return prisma.agent.update({
      where: { id: agent.id },
      data: safeUpdates,
      include: { metrics: true },
    })
  }

  /**
   * Deactivate agent
   */
  async deactivateAgent(id, wallet) {
    return this.updateAgent(id, { status: 'inactive' }, wallet)
  }

  /**
   * Update post-execution metrics atomically
   */
  async recordExecution(agentId, { success, latency, revenue }) {
    await prisma.$transaction(async (tx) => {
      const agent = await tx.agent.findUnique({ where: { id: agentId } })
      if (!agent) return

      const newCalls = agent.calls + 1
      const prevSuccessCount = Math.round((agent.successRate / 100) * agent.calls)
      const newSuccessCount = prevSuccessCount + (success ? 1 : 0)
      const newSuccessRate = parseFloat(((newSuccessCount / newCalls) * 100).toFixed(2))

      await tx.agent.update({
        where: { id: agentId },
        data: {
          calls: { increment: 1 },
          successRate: newSuccessRate,
          revenue: { increment: revenue || 0 },
        },
      })

      const metrics = await tx.usageMetrics.findUnique({ where: { agentId } })
      if (metrics) {
        const newAvgLatency = metrics.calls === 0
          ? latency
          : Math.round((metrics.avgLatency * metrics.calls + (latency || 0)) / (metrics.calls + 1))

        await tx.usageMetrics.update({
          where: { agentId },
          data: {
            calls: { increment: 1 },
            successRate: newSuccessRate,
            revenue: { increment: revenue || 0 },
            avgLatency: newAvgLatency,
          },
        })
      }

      await tx.globalStats.update({
        where: { id: 'global' },
        data: {
          totalCalls: { increment: 1 },
          totalRevenue: { increment: revenue || 0 },
        },
      })
    })
  }

  /**
   * Search agents full text
   */
  async searchAgents(query) {
    return prisma.agent.findMany({
      where: {
        status: { not: 'inactive' },
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { tags: { has: query.toLowerCase() } },
          { category: { equals: query } },
        ],
      },
      take: 20,
      orderBy: { score: 'desc' },
    })
  }
}

export default new AgentService()