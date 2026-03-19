import agentService from '../services/agentService.js'
import prisma from '../lib/prisma.js' // Added to handle direct draft deletion
import { asyncHandler } from '../middlewares/errorHandler.js'
import { z } from 'zod'

// ── Validation schemas ────────────────────────────────────

const deployBaseSchema = z.object({
  name: z.string().min(2).max(64),
  description: z.string().min(10).max(1000).optional(),
  category: z.enum(['Analysis', 'Development', 'Security', 'Data', 'NLP', 'Web3', 'Other']),
  tags: z.array(z.string().max(32)).max(10).optional(),
  pricing: z.number().min(0),
  mcpSchema: z.record(z.string(), z.unknown()).optional(),
  deployMode: z.enum(['database', 'blockchain']).default('blockchain'),
  ownerWallet: z.string().optional(),
  status: z.string().optional(), // Allow status to be passed from frontend
})

const blockchainDeploySchema = deployBaseSchema.extend({
  endpoint: z.string().url(),
})

const databaseDeploySchema = deployBaseSchema.extend({
  endpoint: z.string().url().optional().default(''),
})

const updateSchema = z.object({
  name: z.string().min(2).max(64).optional(),
  description: z.string().min(10).max(1000).optional(),
  endpoint: z.string().url().optional(),
  pricing: z.number().min(0).max(100).optional(),
  tags: z.array(z.string()).optional(),
  category: z.enum(['Analysis', 'Development', 'Security', 'Data', 'NLP', 'Web3', 'Other']).optional(),
})

// ── Controllers ───────────────────────────────────────────

const getAgents = asyncHandler(async (req, res) => {
  const { category, search, status, sortBy, page, limit, mine } = req.query

  const result = await agentService.getAgents({
    category: category === 'all' ? undefined : category,
    search,
    status: (!status || status === 'all') ? 'active' : status, // Only show active agents
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

// 1. DEPLOY (Creates ACTIVE for DB, DRAFT for Blockchain)
const deployAgent = asyncHandler(async (req, res) => {
  const { deployMode = 'blockchain', status } = req.body

  let data
  try {
    if (deployMode === 'database') {
      data = databaseDeploySchema.parse(req.body)
    } else {
      data = blockchainDeploySchema.parse(req.body)
    }
  } catch (err) {
    throw err
  }

  // Determine actual status
  const isDraft = deployMode === 'blockchain' && status === 'DRAFT'
  const finalStatus = isDraft ? 'draft' : 'active'

  // Pass custom data to your existing service
  const agentPayload = { ...data, status: finalStatus, deployMode }
  const agent = await agentService.createAgent(agentPayload, req.walletAddress)

  // Generate metadataURI for the smart contract (In prod, upload to IPFS here)
  const metadataURI = `https://api.agentra.io/metadata/${agent.id}`
  
  // Update the draft with the URI
  const updatedAgent = await prisma.agent.update({
    where: { id: agent.id },
    data: { metadataUri: metadataURI }
  })

  res.status(201).json({ ...updatedAgent, metadataURI })
})

// 2. CONFIRM DEPLOY (State Machine Resolution)
const confirmDeploy = asyncHandler(async (req, res) => {
  const { txHash } = req.body
  const { id } = req.params

  // In production, use ethers/viem here to read the blockchain receipt using txHash 
  // and extract the exact `agentId` from the emitted event. 
  // For now, we mock the contractAgentId.
  const mockContractAgentId = Math.floor(Math.random() * 10000)

  const agent = await prisma.agent.update({
    where: { 
      id: id,
      ownerWallet: req.walletAddress // Security check
    },
    data: {
      status: 'active',
      txHash: txHash,
      contractAgentId: mockContractAgentId,
      isVerified: true
    }
  })

  res.json({ success: true, agent })
})

// 3. CANCEL DRAFT (Rollback)
const cancelDraft = asyncHandler(async (req, res) => {
  const { id } = req.params

  // Only delete if it's actually a draft and belongs to the user
  await prisma.agent.delete({
    where: { 
      id: id,
      status: 'draft',
      ownerWallet: req.walletAddress
    }
  })

  res.json({ success: true, message: 'Draft cleared' })
})

const updateAgent = asyncHandler(async (req, res) => {
  const data = updateSchema.parse(req.body)
  const agent = await agentService.updateAgent(req.params.id, data, req.walletAddress)
  res.json(agent)
})

const deleteAgent = asyncHandler(async (req, res) => {
  await agentService.deactivateAgent(req.params.id, req.walletAddress)
  res.json({ message: 'Agent deactivated successfully' })
})

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
  getAgents, getAgentById, deployAgent, confirmDeploy, cancelDraft,
  updateAgent, deleteAgent, validateEndpoint, searchAgents,
}