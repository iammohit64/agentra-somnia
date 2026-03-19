import { ethers } from 'ethers'
import prisma from '../lib/prisma.js'
import { asyncHandler } from '../middlewares/errorHandler.js'

const generateNonce = () =>
  Math.random().toString(36).substring(2) + Date.now().toString(36)

/**
 * GET /auth/nonce/:address
 */
const getNonce = asyncHandler(async (req, res) => {
  const { address } = req.params

  if (!ethers.isAddress(address)) {
    return res.status(400).json({ error: 'Invalid wallet address' })
  }

  const normalized = address.toLowerCase()
  const nonce = generateNonce()

  await prisma.user.upsert({
    where: { walletAddress: normalized },
    update: { nonce },
    create: {
      walletAddress: normalized,
      nonce,
      totalRevenue: '0',
    },
  })

  res.json({
    nonce,
    message: `Sign this nonce to authenticate: ${nonce}`,
    walletAddress: normalized,
  })
})

/**
 * POST /auth/verify-wallet
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

  let recoveredAddress
  try {
    recoveredAddress = ethers.verifyMessage(message, signature).toLowerCase()
  } catch {
    return res.status(401).json({ error: 'Invalid signature' })
  }

  if (recoveredAddress !== normalized) {
    return res.status(401).json({ error: 'Signature mismatch' })
  }

  const user = await prisma.user.findUnique({
    where: { walletAddress: normalized },
  })

  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }

  if (!message.includes(user.nonce)) {
    return res.status(401).json({ error: 'Invalid nonce' })
  }

  const newNonce = generateNonce()

  await prisma.user.update({
    where: { walletAddress: normalized },
    data: {
      nonce: newNonce,
      lastSeen: new Date(),
    },
  })

  res.json({
    authenticated: true,
    walletAddress: normalized,
    userId: user.id,
  })
})

/**
 * GET /auth/profile
 */
const getProfile = asyncHandler(async (req, res) => {
  const wallet = req.walletAddress

  const user = await prisma.user.findUnique({
    where: { walletAddress: wallet },
    include: {
      agents: {
        where: { status: { not: 'inactive' } },
        orderBy: { createdAt: 'desc' },
        include: {
          metrics: true,
          accesses: true,
        },
      },
      accesses: {
        include: {
          agent: true,
        },
      },
      transactions: {
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
      _count: {
        select: {
          agents: true,
          transactions: true,
          interactions: true,
        },
      },
    },
  })

  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }

  res.json(user)
})

export { getNonce, verifyWallet, getProfile }