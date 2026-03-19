import { ethers } from 'ethers'
import prisma from '../lib/prisma.js'
import config from '../config/config.js'

// ─────────────────────────────────────────────
// ABIs
// ─────────────────────────────────────────────

const AGENTRA_ABI = [
  'function deployAgent(uint8 tier, uint256 monthlyPrice, string metadataURI)',
  'function purchaseAccess(uint256 agentId, bool isLifetime)',
  'function upvote(uint256 agentId)',
  'function agents(uint256) view returns (uint256 id, address creator, uint8 tier, uint256 monthlyPrice, string metadataURI, uint256 upvotes)',
  'function hasAccess(uint256 agentId, address user) view returns (bool)',

  'event AgentDeployed(uint256 indexed agentId, address indexed creator, uint8 tier)',
  'event AccessPurchased(uint256 indexed agentId, address indexed buyer, bool isLifetime)',
  'event AgentUpvoted(uint256 indexed agentId, address indexed voter)'
]

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)'
]

// ─────────────────────────────────────────────
// SERVICE
// ─────────────────────────────────────────────

class BlockchainService {
  constructor() {
    this.provider = null
    this.wallet = null
    this.agentra = null
    this.token = null
    this._initialized = false
    this._mock = false
  }

  async initialize() {
    if (this._initialized) return

    if (!config.blockchain.rpcUrl) {
      console.warn('[BLOCKCHAIN] Mock mode enabled')
      this._mock = true
      this._initialized = true
      return
    }

    try {
      this.provider = new ethers.JsonRpcProvider(config.blockchain.rpcUrl)

      if (config.blockchain.privateKey) {
        this.wallet = new ethers.Wallet(config.blockchain.privateKey, this.provider)
      }

      const runner = this.wallet || this.provider

      const { agentra, token } = config.blockchain.contracts

      this.agentra = new ethers.Contract(agentra, AGENTRA_ABI, runner)
      this.token = new ethers.Contract(token, ERC20_ABI, runner)

      this._initialized = true
      console.log('[BLOCKCHAIN] ✅ Initialized')
    } catch (err) {
      console.error('[BLOCKCHAIN] ❌ Init failed:', err.message)
      this._mock = true
      this._initialized = true
    }
  }

  // ─────────────────────────────────────────────
  // APPROVAL
  // ─────────────────────────────────────────────

  async _ensureApproval(amountWei) {
    if (this._mock) return

    const owner = this.wallet.address
    const spender = this.agentra.target

    const allowance = await this.token.allowance(owner, spender)

    if (allowance < amountWei) {
      const tx = await this.token.approve(spender, amountWei)
      await tx.wait(1)
    }
  }

  // ─────────────────────────────────────────────
  // DEPLOY AGENT
  // ─────────────────────────────────────────────

  async deployAgent(tier, monthlyPriceWei, metadataURI) {
    if (this._mock) return { success: true, txHash: `0xmock_${Date.now()}` }

    try {
      const fee = this._getListingFee(tier)

      await this._ensureApproval(fee)

      const tx = await this.agentra.deployAgent(tier, monthlyPriceWei, metadataURI)
      const receipt = await tx.wait(1)

      return { success: true, txHash: receipt.hash }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  // ─────────────────────────────────────────────
  // PURCHASE ACCESS
  // ─────────────────────────────────────────────

  async purchaseAccess(agentId, isLifetime, monthlyPriceWei) {
    if (this._mock) return { success: true, txHash: `0xmock_${Date.now()}` }

    try {
      const totalCost = isLifetime
        ? BigInt(monthlyPriceWei) * 12n
        : BigInt(monthlyPriceWei)

      await this._ensureApproval(totalCost)

      const tx = await this.agentra.purchaseAccess(agentId, isLifetime)
      const receipt = await tx.wait(1)

      return { success: true, txHash: receipt.hash }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  // ─────────────────────────────────────────────
  // UPVOTE
  // ─────────────────────────────────────────────

  async upvote(agentId) {
    if (this._mock) return { success: true, txHash: `0xmock_${Date.now()}` }

    try {
      const cost = BigInt(config.token.upvoteCostWei)

      await this._ensureApproval(cost)

      const tx = await this.agentra.upvote(agentId)
      const receipt = await tx.wait(1)

      return { success: true, txHash: receipt.hash }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  // ─────────────────────────────────────────────
  // READ
  // ─────────────────────────────────────────────

  async getAgent(agentId) {
    if (this._mock) return null

    try {
      const a = await this.agentra.agents(agentId)

      return {
        id: Number(a.id),
        creator: a.creator,
        tier: Number(a.tier),
        monthlyPrice: a.monthlyPrice.toString(),
        metadataURI: a.metadataURI,
        upvotes: Number(a.upvotes),
      }
    } catch {
      return null
    }
  }

  async hasAccess(agentId, user) {
    if (this._mock) return true

    try {
      return await this.agentra.hasAccess(agentId, user)
    } catch {
      return false
    }
  }

  async getTokenBalance(walletAddress) {
    if (this._mock) return '0'

    try {
      const bal = await this.token.balanceOf(walletAddress)
      return bal.toString()
    } catch {
      return '0'
    }
  }

  // ─────────────────────────────────────────────
  // EVENTS
  // ─────────────────────────────────────────────

  startEventListeners() {
    if (this._mock) return

    // Agent deployed
    this.agentra.on('AgentDeployed', async (agentId, creator, tier, event) => {
      try {
        await prisma.agent.updateMany({
          where: { contractAgentId: Number(agentId) },
          data: { status: 'active' },
        })
      } catch (err) {
        console.error('[EVENT] AgentDeployed error:', err.message)
      }
    })

    // Access purchased
    this.agentra.on('AccessPurchased', async (agentId, buyer, isLifetime, event) => {
      try {
        const expiresAt = isLifetime
          ? new Date('9999-12-31')
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

        await prisma.agentAccess.upsert({
          where: {
            agentId_userWallet: {
              agentId: String(agentId),
              userWallet: buyer,
            },
          },
          update: { expiresAt, isLifetime },
          create: {
            agentId: String(agentId),
            userWallet: buyer,
            expiresAt,
            isLifetime,
          },
        })

        const agent = await prisma.agent.findFirst({
          where: { contractAgentId: Number(agentId) },
        })

        if (agent) {
          await prisma.transaction.create({
            data: {
              txHash: event.log.transactionHash,
              type: 'purchase_access',
              status: 'confirmed',
              agentId: agent.agentId,
              callerWallet: buyer,
              ownerWallet: agent.ownerWallet,
              totalAmount: agent.pricing,
            },
          })
        }
      } catch (err) {
        console.error('[EVENT] AccessPurchased error:', err.message)
      }
    })

    // Upvote
    this.agentra.on('AgentUpvoted', async (agentId, voter, event) => {
      try {
        const agent = await prisma.agent.findFirst({
          where: { contractAgentId: Number(agentId) },
        })

        if (agent) {
          await prisma.agent.update({
            where: { id: agent.id },
            data: { upvotes: { increment: 1 } },
          })

          await prisma.transaction.create({
            data: {
              txHash: event.log.transactionHash,
              type: 'upvote',
              status: 'confirmed',
              agentId: agent.agentId,
              callerWallet: voter,
              ownerWallet: agent.ownerWallet,
              totalAmount: config.token.upvoteCostWei,
            },
          })
        }
      } catch (err) {
        console.error('[EVENT] Upvote error:', err.message)
      }
    })

    console.log('[BLOCKCHAIN] ✅ Event listeners started')
  }

  // ─────────────────────────────────────────────
  // INTERNAL
  // ─────────────────────────────────────────────

  _getListingFee(tier) {
    if (tier === 0) return BigInt(config.token.listingFeesWei.standard)
    if (tier === 1) return BigInt(config.token.listingFeesWei.professional)
    if (tier === 2) return BigInt(config.token.listingFeesWei.enterprise)
  }

  // ─────────────────────────────────────────────
  // ANALYTICS
  // ─────────────────────────────────────────────

  async calculateRevenue(ownerWallet) {
    const txs = await prisma.transaction.findMany({
      where: { ownerWallet, status: 'confirmed' },
    })

    let total = 0n

    for (const tx of txs) {
      total += BigInt(tx.totalAmount || '0')
    }

    return {
      totalWei: total.toString(),
      txCount: txs.length,
    }
  }
}

export default new BlockchainService()