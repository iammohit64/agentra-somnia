import { ethers } from 'ethers'
import prisma from '../lib/prisma.js'
import config from '../config/config.js'

// Minimal ABIs
const AGENT_REGISTRY_ABI = [
  'function registerAgent(string agentId, address owner, string metadataUri, uint256 pricing) returns (uint256)',
  'function getAgent(string agentId) view returns (address owner, string metadataUri, uint256 pricing, bool active)',
  'function deactivateAgent(string agentId)',
  'event AgentRegistered(string indexed agentId, address indexed owner, uint256 pricing)',
]

const PAYMENT_ABI = [
  'function payForCall(string agentId) payable',
  'function withdraw()',
  'function getBalance(address owner) view returns (uint256)',
  'event PaymentProcessed(string indexed agentId, address indexed caller, uint256 amount)',
]

const VOTING_ABI = [
  'function vote(string agentId, bool upvote)',
  'function getVotes(string agentId) view returns (uint256 upvotes, uint256 downvotes)',
  'event Voted(string indexed agentId, address indexed voter, bool upvote)',
]

class BlockchainService {
  constructor() {
    this.provider = null
    this.wallet = null
    this.contracts = {}
    this._initialized = false
  }

  async initialize() {
    if (this._initialized) return

    if (!config.blockchain.rpcUrl) {
      console.warn('[BLOCKCHAIN] No RPC URL configured — running in mock mode')
      return
    }

    try {
      this.provider = new ethers.JsonRpcProvider(config.blockchain.rpcUrl)
      await this.provider.getNetwork()

      if (config.blockchain.privateKey) {
        this.wallet = new ethers.Wallet(config.blockchain.privateKey, this.provider)
      }

      // Init contracts if addresses present
      const { agentRegistry, payment, voting } = config.blockchain.contracts

      if (agentRegistry) {
        this.contracts.agentRegistry = new ethers.Contract(
          agentRegistry,
          AGENT_REGISTRY_ABI,
          this.wallet || this.provider
        )
      }

      if (payment) {
        this.contracts.payment = new ethers.Contract(
          payment,
          PAYMENT_ABI,
          this.wallet || this.provider
        )
      }

      if (voting) {
        this.contracts.voting = new ethers.Contract(
          voting,
          VOTING_ABI,
          this.wallet || this.provider
        )
      }

      this._initialized = true
      console.log('[BLOCKCHAIN] ✅ Initialized — chainId:', (await this.provider.getNetwork()).chainId)
    } catch (err) {
      console.error('[BLOCKCHAIN] ❌ Init failed:', err.message)
    }
  }

  /**
   * Verify a transaction exists and paid enough
   */
  async verifyTransaction(txHash, expectedAmount) {
    if (!this.provider) {
      console.warn('[BLOCKCHAIN] Mock mode — skipping tx verification')
      return true
    }

    try {
      const tx = await this.provider.getTransaction(txHash)
      if (!tx) return false

      const receipt = await this.provider.getTransactionReceipt(txHash)
      if (!receipt || receipt.status !== 1) return false

      const paidEth = parseFloat(ethers.formatEther(tx.value))
      return paidEth >= expectedAmount
    } catch (err) {
      console.error('[BLOCKCHAIN] verifyTransaction error:', err.message)
      return false
    }
  }

  /**
   * Register agent on-chain
   */
  async registerAgentOnChain(agentId, ownerWallet, metadataUri, pricingEth) {
    if (!this.contracts.agentRegistry) {
      return { success: false, reason: 'No contract configured', mock: true }
    }

    try {
      const pricingWei = ethers.parseEther(pricingEth.toString())
      const tx = await this.contracts.agentRegistry.registerAgent(
        agentId,
        ownerWallet,
        metadataUri || '',
        pricingWei
      )
      const receipt = await tx.wait()
      return { success: true, txHash: receipt.hash }
    } catch (err) {
      console.error('[BLOCKCHAIN] registerAgentOnChain error:', err.message)
      return { success: false, error: err.message }
    }
  }

  /**
   * Get agent on-chain data
   */
  async getAgentOnChain(agentId) {
    if (!this.contracts.agentRegistry) return null
    try {
      const data = await this.contracts.agentRegistry.getAgent(agentId)
      return {
        owner: data.owner,
        metadataUri: data.metadataUri,
        pricing: parseFloat(ethers.formatEther(data.pricing)),
        active: data.active,
      }
    } catch {
      return null
    }
  }

  /**
   * Get ETH balance for wallet
   */
  async getBalance(walletAddress) {
    if (!this.provider) return '0'
    try {
      const bal = await this.provider.getBalance(walletAddress)
      return ethers.formatEther(bal)
    } catch {
      return '0'
    }
  }

  /**
   * Get on-chain vote counts
   */
  async getVotes(agentId) {
    if (!this.contracts.voting) return { upvotes: 0, downvotes: 0 }
    try {
      const votes = await this.contracts.voting.getVotes(agentId)
      return {
        upvotes: Number(votes.upvotes),
        downvotes: Number(votes.downvotes),
      }
    } catch {
      return { upvotes: 0, downvotes: 0 }
    }
  }

  /**
   * Start listening to contract events
   */
  startEventListeners() {
    if (!this.contracts.payment) return

    this.contracts.payment.on('PaymentProcessed', async (agentId, caller, amount) => {
      console.log(`[BLOCKCHAIN] Payment received — Agent: ${agentId}, Caller: ${caller}, Amount: ${ethers.formatEther(amount)} ETH`)
      // Update revenue in DB
      try {
        const agent = await prisma.agent.findFirst({ where: { agentId } })
        if (agent) {
          await prisma.agent.update({
            where: { id: agent.id },
            data: { revenue: { increment: parseFloat(ethers.formatEther(amount)) } },
          })
        }
      } catch (err) {
        console.error('[BLOCKCHAIN] Event handler error:', err.message)
      }
    })

    console.log('[BLOCKCHAIN] Event listeners started')
  }

  /**
   * Calculate platform revenue
   */
  async calculateRevenue(ownerWallet) {
    const transactions = await prisma.transaction.findMany({
      where: { ownerWallet, status: 'confirmed' },
      select: { amount: true, platformFee: true },
    })
    const gross = transactions.reduce((s, t) => s + t.amount, 0)
    const fees = transactions.reduce((s, t) => s + t.platformFee, 0)
    return {
      gross: parseFloat(gross.toFixed(6)),
      fees: parseFloat(fees.toFixed(6)),
      net: parseFloat((gross - fees).toFixed(6)),
      txCount: transactions.length,
    }
  }
}

export default new BlockchainService()