import agentService from '../services/agentService.js'
import prisma from '../lib/prisma.js'
import contractManager from '../lib/contractManager.js'
import config from '../config/config.js'
import { asyncHandler } from '../middlewares/errorHandler.js'
import { z } from 'zod'

// ── Validation schemas ────────────────────────────────────

const deploySchema = z.object({
  name: z.string().min(2).max(64),
  description: z.string().min(10).max(1000).optional(),
  category: z.enum(['Analysis', 'Development', 'Security', 'Data', 'NLP', 'Web3', 'Other']),
  tags: z.array(z.string().max(32)).max(10).optional(),
  pricing: z.string(), // wei string
  tier: z.enum(['Standard', 'Professional', 'Enterprise']),
  endpoint: z.string().url(),
  mcpSchema: z.record(z.string(), z.unknown()).optional(),
})

const updateSchema = z.object({
  name: z.string().min(2).max(64).optional(),
  description: z.string().min(10).max(1000).optional(),
  endpoint: z.string().url().optional(),
  pricing: z.string().optional(),
  tags: z.array(z.string()).optional(),
  category: z.enum(['Analysis', 'Development', 'Security', 'Data', 'NLP', 'Web3', 'Other']).optional(),
})

// ── Helpers ───────────────────────────────────────────────

const TIER_MAP = {
  Standard: 0,
  Professional: 1,
  Enterprise: 2,
}

// ── Controllers ───────────────────────────────────────────

const getAgents = asyncHandler(async (req, res) => {
  const { category, search, status, sortBy, page, limit, mine } = req.query

  const result = await agentService.getAgents({
    category: category === 'all' ? undefined : category,
    search,
    status: (!status || status === 'all') ? 'active' : status,
    sortBy: sortBy || 'score',
    page: parseInt(page) || 1,
    limit: Math.min(parseInt(limit) || 20, 100),
    ownerWallet: mine === 'true' ? req.walletAddress : undefined,
  })

  res.json(result)
})

const getAgentById = asyncHandler(async (req, res) => {
  const agent = await agentService.getById(req.params.id)
  res.json(agent)
})

// ── DEPLOY AGENT (ON-CHAIN + DB) ───────────────────────────

const deployAgent = asyncHandler(async (req, res) => {
  const data = deploySchema.parse(req.body)

  const metadataURI = `https://api.agentra.io/metadata/temp-${Date.now()}`

  // 1. Call smart contract
  const tx = await contractManager.deployAgent(
    TIER_MAP[data.tier],
    BigInt(data.pricing),
    metadataURI
  )

  if (!tx.success) {
    return res.status(400).json({ error: tx.error })
  }

  // 2. Create DB record (pending confirmation)
  const agent = await prisma.agent.create({
    data: {
      name: data.name,
      description: data.description,
      metadataUri: metadataURI,
      ownerWallet: req.walletAddress,
      endpoint: data.endpoint,
      tier: data.tier,
      pricing: data.pricing,
      category: data.category,
      tags: data.tags || [],
      status: 'draft',
      txHash: tx.txHash,
    },
  })

  // 3. Log transaction
  await prisma.transaction.create({
    data: {
      txHash: tx.txHash,
      type: 'deploy',
      status: 'pending',
      agentId: agent.agentId,
      callerWallet: req.walletAddress,
      ownerWallet: req.walletAddress,
      totalAmount: '0',
    },
  })

  res.status(201).json(agent)
})

// ── CONFIRM DEPLOY (SYNC CONTRACT ID) ──────────────────────

const confirmDeploy = asyncHandler(async (req, res) => {
  const { contractAgentId } = req.body
  const { id } = req.params

  const agent = await prisma.agent.update({
    where: {
      id,
      ownerWallet: req.walletAddress,
    },
    data: {
      status: 'active',
      contractAgentId: parseInt(contractAgentId),
      isVerified: true,
    },
  })

  await prisma.transaction.updateMany({
    where: {
      agentId: agent.agentId,
      type: 'deploy',
    },
    data: {
      status: 'confirmed',
    },
  })

  res.json({ success: true, agent })
})

// ── CANCEL DRAFT ───────────────────────────────────────────

const cancelDraft = asyncHandler(async (req, res) => {
  const { id } = req.params

  await prisma.agent.delete({
    where: {
      id,
      status: 'draft',
      ownerWallet: req.walletAddress,
    },
  })

  res.json({ success: true })
})

// ── PURCHASE ACCESS ────────────────────────────────────────

const purchaseAccess = asyncHandler(async (req, res) => {
  const { agentId } = req.params
  const { isLifetime } = req.body

  const agent = await prisma.agent.findUnique({ where: { agentId } })
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
      callerWallet: req.walletAddress,
      ownerWallet: agent.ownerWallet,
      totalAmount: totalCost,
      platformFee,
      creatorAmount,
    },
  })

  res.json({ success: true })
})

// ── UPVOTE ────────────────────────────────────────────────

const upvoteAgent = asyncHandler(async (req, res) => {
  const { agentId } = req.params

  const agent = await prisma.agent.findUnique({ where: { agentId } })
  if (!agent) return res.status(404).json({ error: 'Agent not found' })

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
      callerWallet: req.walletAddress,
      ownerWallet: agent.ownerWallet,
      totalAmount: config.token.upvoteCostWei,
      platformFee: '0',
      creatorAmount: config.token.upvoteCostWei,
    },
  })

  await prisma.agent.update({
    where: { id: agent.id },
    data: {
      upvotes: { increment: 1 },
    },
  })

  res.json({ success: true })
})

// ── UPDATE / DELETE ───────────────────────────────────────

const updateAgent = asyncHandler(async (req, res) => {
  const data = updateSchema.parse(req.body)
  const agent = await agentService.updateAgent(req.params.id, data, req.walletAddress)
  res.json(agent)
})

const deleteAgent = asyncHandler(async (req, res) => {
  await agentService.deactivateAgent(req.params.id, req.walletAddress)
  res.json({ message: 'Agent deactivated successfully' })
})

// ── OTHER ─────────────────────────────────────────────────

const validateEndpoint = asyncHandler(async (req, res) => {
  const { endpoint } = req.body
  if (!endpoint) return res.status(400).json({ error: 'endpoint required' })
  const result = await agentService.validateEndpoint(endpoint)
  res.json(result)
})

const searchAgents = asyncHandler(async (req, res) => {
  const { q } = req.query
  if (!q) return res.status(400).json({ error: 'query param q required' })
  const agents = await agentService.searchAgents(q)
  res.json(agents)
})

export {
  getAgents,
  getAgentById,
  deployAgent,
  confirmDeploy,
  cancelDraft,
  purchaseAccess,
  upvoteAgent,
  updateAgent,
  deleteAgent,
  validateEndpoint,
  searchAgents,
}