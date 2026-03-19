import orchestrator from '../orchestrator/orchestrator.js'
import prisma from '../lib/prisma.js'
import contractManager from '../lib/contractManager.js'
import config from '../config/config.js'
import { asyncHandler } from '../middlewares/errorHandler.js'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'

const executeSchema = z.object({
  task: z.string().min(1).max(10000),
})

const composeSchema = z.object({
  agents: z.array(z.object({
    agentId: z.string(),
    task: z.string().min(1),
  })).min(2).max(5),
  sequential: z.boolean().optional(),
})

/**
 * POST /agents/:id/execute
 */
const executeAgent = asyncHandler(async (req, res) => {
  const { task } = executeSchema.parse(req.body)
  const { id } = req.params
  const callerWallet = req.walletAddress

  const agent = await prisma.agent.findFirst({
    where: { OR: [{ id }, { agentId: id }] },
  })

  if (!agent) return res.status(404).json({ error: 'Agent not found' })

  const hasAccess = await contractManager.hasAccess(agent.contractAgentId, callerWallet)
  if (!hasAccess) {
    return res.status(403).json({ error: 'Access not purchased' })
  }

  const result = await orchestrator.executeAgent(agent.agentId, task, callerWallet)

  res.json(result)
})

/**
 * POST /agents/compose
 */
const composeAgents = asyncHandler(async (req, res) => {
  const { agents, sequential = false } = composeSchema.parse(req.body)
  const callerWallet = req.walletAddress
  const callChainId = uuidv4()

  let results

  if (sequential) {
    results = []
    let context = ''

    for (const [i, agentInput] of agents.entries()) {
      const agent = await prisma.agent.findFirst({
        where: { agentId: agentInput.agentId },
      })

      if (!agent) continue

      const hasAccess = await contractManager.hasAccess(agent.contractAgentId, callerWallet)
      if (!hasAccess) continue

      const task = context
        ? `${agentInput.task}\n\nContext:\n${context}`
        : agentInput.task

      const result = await orchestrator.executeAgent(agent.agentId, task, callerWallet, {
        callChainId,
        callDepth: i,
      })

      results.push(result)

      context =
        typeof result.response === 'string'
          ? result.response
          : JSON.stringify(result.response)
    }
  } else {
    results = await Promise.all(
      agents.map(async (agentInput, i) => {
        const agent = await prisma.agent.findFirst({
          where: { agentId: agentInput.agentId },
        })

        if (!agent) return null

        const hasAccess = await contractManager.hasAccess(agent.contractAgentId, callerWallet)
        if (!hasAccess) return null

        return orchestrator.executeAgent(agent.agentId, agentInput.task, callerWallet, {
          callChainId,
          callDepth: i,
        })
      })
    )
  }

  res.json({
    mode: sequential ? 'sequential' : 'parallel',
    agentCount: agents.length,
    callChainId,
    results,
  })
})

/**
 * POST /agents/:id/purchase
 */
const purchaseAccess = asyncHandler(async (req, res) => {
  const { isLifetime } = req.body
  const { id } = req.params
  const callerWallet = req.walletAddress

  const agent = await prisma.agent.findFirst({
    where: { OR: [{ id }, { agentId: id }] },
  })

  if (!agent) return res.status(404).json({ error: 'Agent not found' })

  const tx = await contractManager.purchaseAccess(
    agent.contractAgentId,
    isLifetime,
    agent.pricing
  )

  if (!tx.success) {
    return res.status(400).json({ error: tx.error })
  }

  const totalCost = isLifetime
    ? (BigInt(agent.pricing) * 12n).toString()
    : agent.pricing

  const platformFee = (BigInt(totalCost) * 20n / 100n).toString()
  const creatorAmount = (BigInt(totalCost) - BigInt(platformFee)).toString()

  await prisma.transaction.create({
    data: {
      txHash: tx.txHash,
      type: 'purchase_access',
      status: 'confirmed',
      agentId: agent.agentId,
      callerWallet,
      ownerWallet: agent.ownerWallet,
      totalAmount: totalCost,
      platformFee,
      creatorAmount,
    },
  })

  res.json({ success: true, txHash: tx.txHash })
})

/**
 * POST /agents/:id/upvote
 */
const upvoteAgent = asyncHandler(async (req, res) => {
  const { id } = req.params
  const voterWallet = req.walletAddress

  const agent = await prisma.agent.findFirst({
    where: { OR: [{ id }, { agentId: id }] },
  })

  if (!agent) return res.status(404).json({ error: 'Agent not found' })

  if (agent.ownerWallet === voterWallet) {
    return res.status(400).json({ error: 'Cannot upvote your own agent' })
  }

  const tx = await contractManager.upvote(
    agent.contractAgentId,
    config.token.upvoteCostWei
  )

  if (!tx.success) {
    return res.status(400).json({ error: tx.error })
  }

  await prisma.transaction.create({
    data: {
      txHash: tx.txHash,
      type: 'upvote',
      status: 'confirmed',
      agentId: agent.agentId,
      callerWallet: voterWallet,
      ownerWallet: agent.ownerWallet,
      totalAmount: config.token.upvoteCostWei,
      creatorAmount: config.token.upvoteCostWei,
      platformFee: '0',
    },
  })

  res.json({ success: true, txHash: tx.txHash })
})

/**
 * GET /agents/:id/interactions
 */
const getInteractions = asyncHandler(async (req, res) => {
  const { id } = req.params
  const limit = Math.min(parseInt(req.query.limit) || 50, 200)

  const history = await orchestrator.getInteractionHistory(id, limit)
  res.json(history)
})

export {
  executeAgent,
  composeAgents,
  purchaseAccess,
  upvoteAgent,
  getInteractions
}