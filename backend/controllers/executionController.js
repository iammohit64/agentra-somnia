import orchestrator from '../orchestrator/orchestrator.js'
import prisma from '../lib/prisma.js'
import { asyncHandler, createError } from '../middlewares/errorHandler.js'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'

const executeSchema = z.object({
  task: z.string().min(1).max(10000),
  txHash: z.string().optional(),
})

const composeSchema = z.object({
  agents: z.array(z.object({
    agentId: z.string(),
    task: z.string().min(1),
    txHash: z.string().optional(),
  })).min(2).max(5),
  sequential: z.boolean().optional(),
})

const voteSchema = z.object({
  vote: z.enum(['up', 'down']),
})

/**
 * POST /agents/:id/execute
 */
const executeAgent = asyncHandler(async (req, res) => {
  const { task, txHash } = executeSchema.parse(req.body)
  const { id } = req.params
  const callerWallet = req.walletAddress

  const result = await orchestrator.executeAgent(id, task, callerWallet, { txHash })
  res.json(result)
})

/**
 * POST /agents/compose
 * Execute multiple agents in sequence or parallel
 */
const composeAgents = asyncHandler(async (req, res) => {
  const { agents, sequential = false } = composeSchema.parse(req.body)
  const callerWallet = req.walletAddress
  const callChainId = uuidv4()

  let results
  if (sequential) {
    // Sequential: output of each becomes input context for next
    results = []
    let context = ''
    for (const [i, agent] of agents.entries()) {
      const task = context ? `${agent.task}\n\nContext from previous agent:\n${context}` : agent.task
      const result = await orchestrator.executeAgent(agent.agentId, task, callerWallet, {
        txHash: agent.txHash,
        callChainId,
        callDepth: i,
      })
      results.push(result)
      context = typeof result.response === 'string'
        ? result.response
        : JSON.stringify(result.response)
    }
  } else {
    // Parallel
    results = await Promise.all(
      agents.map((agent, i) =>
        orchestrator.executeAgent(agent.agentId, agent.task, callerWallet, {
          txHash: agent.txHash,
          callChainId,
          callDepth: i,
        })
      )
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
 * POST /agents/:id/vote
 */
const voteOnAgent = asyncHandler(async (req, res) => {
  const { vote } = voteSchema.parse(req.body)
  const { id } = req.params
  const voterWallet = req.walletAddress

  // Find agent
  const isObjectId = /^[a-f\d]{24}$/i.test(id)
const agent = await prisma.agent.findFirst({
  where: isObjectId
    ? { OR: [{ id }, { agentId: id }] }
    : { agentId: id },
})
  if (!agent) return res.status(404).json({ error: 'Agent not found' })

  // Cannot vote on your own agent
  if (agent.ownerWallet === voterWallet) {
    return res.status(400).json({ error: 'Cannot vote on your own agent' })
  }

  // Upsert vote (change vote allowed)
  const existingVote = await prisma.vote.findUnique({
    where: { agentId_voterWallet: { agentId: agent.id, voterWallet } },
  })

  let voteRecord
  if (existingVote) {
    voteRecord = await prisma.vote.update({
      where: { id: existingVote.id },
      data: { vote },
    })
  } else {
    voteRecord = await prisma.vote.create({
      data: { agentId: agent.id, voterWallet, vote },
    })
  }

  // Get updated vote counts
  const [upvotes, downvotes] = await prisma.$transaction([
    prisma.vote.count({ where: { agentId: agent.id, vote: 'up' } }),
    prisma.vote.count({ where: { agentId: agent.id, vote: 'down' } }),
  ])

  // Recalculate rating
  const totalVotes = upvotes + downvotes
  const newRating = totalVotes > 0
    ? parseFloat((1 + (upvotes / totalVotes) * 4).toFixed(2))
    : agent.rating

  await prisma.agent.update({
    where: { id: agent.id },
    data: { rating: newRating, ratingCount: totalVotes },
  })

  res.json({
    vote: voteRecord.vote,
    upvotes,
    downvotes,
    rating: newRating,
  })
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

export { executeAgent, composeAgents, voteOnAgent, getInteractions }