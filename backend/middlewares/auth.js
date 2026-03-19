import { ethers } from 'ethers'
import prisma from '../lib/prisma.js'

/**
 * Full auth — wallet address must be present in header
 */
const authMiddleware = async (req, res, next) => {
  try {
    const walletAddress = req.headers['x-wallet-address']

    if (!walletAddress) {
      return res.status(401).json({ error: 'Wallet address required in x-wallet-address header' })
    }

    if (!ethers.isAddress(walletAddress)) {
      return res.status(401).json({ error: 'Invalid wallet address format' })
    }

    const normalized = walletAddress.toLowerCase()

    // Upsert user — create if first time seen
    const user = await prisma.user.upsert({
      where: { walletAddress: normalized },
      update: { lastSeen: new Date() },
      create: { walletAddress: normalized },
    })

    req.walletAddress = normalized
    req.user = user
    next()
  } catch (err) {
    next(err)
  }
}

/**
 * Optional auth — attaches wallet if present, continues either way
 */
const optionalAuth = async (req, res, next) => {
  try {
    const walletAddress = req.headers['x-wallet-address']
    if (walletAddress && ethers.isAddress(walletAddress)) {
      req.walletAddress = walletAddress.toLowerCase()
      const user = await prisma.user.findUnique({
        where: { walletAddress: req.walletAddress },
      })
      req.user = user
    }
    next()
  } catch {
    next()
  }
}

export { authMiddleware, optionalAuth }