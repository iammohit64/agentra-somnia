import { ethers } from 'ethers'
import prisma from '../lib/prisma.js'
import { asyncHandler } from '../middlewares/errorHandler.js'

/**
 * GET /auth/nonce/:address
 * Returns a nonce for the wallet to sign
 */
const getNonce = asyncHandler(async (req, res) => {
  const { address } = req.params

  if (!ethers.isAddress(address)) {
    return res.status(400).json({ error: 'Invalid wallet address' })
  }

  const normalized = address.toLowerCase()
  const nonce = Math.random().toString(36).substring(2) + Date.now().toString(36)

  const user = await prisma.user.upsert({
    where: { walletAddress: normalized },
    update: { nonce },
    create: { walletAddress: normalized, nonce },
  })

  res.json({
    nonce,
    message: `Sign this nonce to authenticate with Neural Market: ${nonce}`,
    walletAddress: normalized,
  })
})

/**
 * POST /auth/verify-wallet
 * Verifies a signed nonce — full SIWE-style auth
 */
const verifyWallet = asyncHandler(async (req, res) => {
  const { address, signature, message } = req.body

  if (!address || !signature || !message) {
    return res.status(400).json({ error: 'address, signature, and message are required' })
  }

  if (!ethers.isAddress(address)) {
    return res.status(400).json({ error: 'Invalid wallet address' })
  }

  const normalized = address.toLowerCase()

  // Recover signer
  let recoveredAddress
  try {
    recoveredAddress = ethers.verifyMessage(message, signature).toLowerCase()
  } catch {
    return res.status(401).json({ error: 'Invalid signature' })
  }

  if (recoveredAddress !== normalized) {
    return res.status(401).json({ error: 'Signature does not match address' })
  }

  // Verify nonce matches
  const user = await prisma.user.findUnique({ where: { walletAddress: normalized } })
  if (!user) {
    return res.status(404).json({ error: 'User not found. Request a nonce first.' })
  }

  if (!message.includes(user.nonce)) {
    return res.status(401).json({ error: 'Invalid nonce in message' })
  }

  // Rotate nonce after use
  const newNonce = Math.random().toString(36).substring(2)
  await prisma.user.update({
    where: { walletAddress: normalized },
    data: { nonce: newNonce, lastSeen: new Date() },
  })

  res.json({
    authenticated: true,
    walletAddress: normalized,
    userId: user.id,
  })
})

/**
 * GET /auth/profile
 * Returns user profile + owned agents
 */
const getProfile = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { walletAddress: req.walletAddress },
    include: {
      agents: {
        where: { status: { not: 'inactive' } },
        orderBy: { createdAt: 'desc' },
        include: { metrics: true },
      },
      _count: {
        select: { agents: true, votes: true, interactions: true },
      },
    },
  })

  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }

  res.json(user)
})

export { getNonce, verifyWallet, getProfile }