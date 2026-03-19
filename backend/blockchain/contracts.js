import { ethers } from 'ethers'
import config from '../config/config.js'

// ─────────────────────────────────────────────────────────────
// FULL ABIs
// ─────────────────────────────────────────────────────────────

const AGENT_REGISTRY_ABI = [
  'function registerAgent(string calldata agentId, address owner, string calldata metadataUri, uint256 pricing) external returns (bool)',
  'function updateAgent(string calldata agentId, string calldata metadataUri, uint256 pricing) external',
  'function deactivateAgent(string calldata agentId) external',
  'function getAgent(string calldata agentId) external view returns (address owner, string memory metadataUri, uint256 pricing, bool active)',
  'function getOwnerAgents(address owner) external view returns (string[] memory)',
  'function isActive(string calldata agentId) external view returns (bool)',
  'event AgentRegistered(string indexed agentId, address indexed owner, uint256 pricing, uint256 timestamp)',
  'event AgentUpdated(string indexed agentId, string metadataUri, uint256 pricing)',
  'event AgentDeactivated(string indexed agentId)',
]

const PAYMENT_ABI = [
  'function payForCall(string calldata agentId) external payable',
  'function withdraw() external',
  'function updateFee(uint256 newFeePercent) external',
  'function getBalance(address owner) external view returns (uint256)',
  'function getAgentRevenue(string calldata agentId) external view returns (uint256)',
  'function platformFeePercent() external view returns (uint256)',
  'function balances(address) external view returns (uint256)',
  'event PaymentProcessed(string indexed agentId, address indexed caller, address indexed agentOwner, uint256 amount, uint256 platformFee, uint256 ownerAmount)',
  'event Withdrawn(address indexed to, uint256 amount)',
  'event FeeUpdated(uint256 newFee)',
]

const VOTING_ABI = [
  'function vote(string calldata agentId, bool upvote) external',
  'function getVotes(string calldata agentId) external view returns (uint256 upvotes, uint256 downvotes)',
  'function getVoteScore(string calldata agentId) external view returns (int256)',
  'function hasVoted(string calldata agentId, address voter) external view returns (int8)',
  'event Voted(string indexed agentId, address indexed voter, bool upvote, uint256 timestamp)',
  'event VoteChanged(string indexed agentId, address indexed voter, bool newVote)',
]

// ─────────────────────────────────────────────────────────────
// CONTRACT MANAGER
// ─────────────────────────────────────────────────────────────

class ContractManager {
  constructor() {
    this.provider = null
    this.signer = null
    this.agentRegistry = null
    this.payment = null
    this.voting = null
    this._initialized = false
    this._mockMode = false
  }

  async init() {
    if (this._initialized) return

    if (!config.blockchain.rpcUrl) {
      console.warn('[CONTRACTS] No RPC URL — running in mock mode')
      this._mockMode = true
      this._initialized = true
      return
    }

    try {
      this.provider = new ethers.JsonRpcProvider(config.blockchain.rpcUrl)
      const network = await this.provider.getNetwork()
      console.log(`[CONTRACTS] Connected to network: ${network.name} (chainId: ${network.chainId})`)

      if (config.blockchain.privateKey) {
        this.signer = new ethers.Wallet(config.blockchain.privateKey, this.provider)
        console.log(`[CONTRACTS] Signer: ${this.signer.address}`)
      }

      const runner = this.signer || this.provider
      const { agentRegistry, payment, voting } = config.blockchain.contracts

      if (agentRegistry && ethers.isAddress(agentRegistry)) {
        this.agentRegistry = new ethers.Contract(agentRegistry, AGENT_REGISTRY_ABI, runner)
        console.log(`[CONTRACTS] AgentRegistry @ ${agentRegistry}`)
      } else {
        console.warn('[CONTRACTS] AgentRegistry address not configured')
      }

      if (payment && ethers.isAddress(payment)) {
        this.payment = new ethers.Contract(payment, PAYMENT_ABI, runner)
        console.log(`[CONTRACTS] Payment @ ${payment}`)
      } else {
        console.warn('[CONTRACTS] Payment address not configured')
      }

      if (voting && ethers.isAddress(voting)) {
        this.voting = new ethers.Contract(voting, VOTING_ABI, runner)
        console.log(`[CONTRACTS] Voting @ ${voting}`)
      } else {
        console.warn('[CONTRACTS] Voting address not configured')
      }

      this._initialized = true
      console.log('[CONTRACTS] ✅ Initialization complete')
    } catch (err) {
      console.error('[CONTRACTS] ❌ Init failed:', err.message)
      this._mockMode = true
      this._initialized = true
    }
  }

  get isMock() {
    return this._mockMode
  }

  _requireContract(name) {
    if (this._mockMode) return null
    const contract = this[name]
    if (!contract) throw new Error(`Contract "${name}" is not configured`)
    return contract
  }

  async registerAgent(agentId, ownerAddress, metadataUri = '', pricingEth) {
    if (this._mockMode) {
      console.log(`[CONTRACTS MOCK] registerAgent: ${agentId}`)
      return { success: true, txHash: `0xmock_${Date.now().toString(16)}`, mock: true }
    }

    const contract = this._requireContract('agentRegistry')
    try {
      const pricingWei = ethers.parseEther(String(pricingEth))
      const tx = await contract.registerAgent(agentId, ownerAddress, metadataUri, pricingWei)
      const receipt = await tx.wait(1)
      return { success: true, txHash: receipt.hash, blockNumber: receipt.blockNumber }
    } catch (err) {
      console.error('[CONTRACTS] registerAgent error:', err.message)
      return { success: false, error: err.message }
    }
  }

  async updateAgent(agentId, metadataUri, pricingEth) {
    if (this._mockMode) return { success: true, mock: true }
    const contract = this._requireContract('agentRegistry')
    try {
      const pricingWei = ethers.parseEther(String(pricingEth))
      const tx = await contract.updateAgent(agentId, metadataUri, pricingWei)
      const receipt = await tx.wait(1)
      return { success: true, txHash: receipt.hash }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  async deactivateAgent(agentId) {
    if (this._mockMode) return { success: true, mock: true }
    const contract = this._requireContract('agentRegistry')
    try {
      const tx = await contract.deactivateAgent(agentId)
      const receipt = await tx.wait(1)
      return { success: true, txHash: receipt.hash }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  async getAgentOnChain(agentId) {
    if (this._mockMode) return null
    const contract = this._requireContract('agentRegistry')
    try {
      const result = await contract.getAgent(agentId)
      return {
        owner: result.owner,
        metadataUri: result.metadataUri,
        pricing: parseFloat(ethers.formatEther(result.pricing)),
        active: result.active,
      }
    } catch (err) {
      console.error('[CONTRACTS] getAgentOnChain error:', err.message)
      return null
    }
  }

  async getOwnerAgents(ownerAddress) {
    if (this._mockMode) return []
    const contract = this._requireContract('agentRegistry')
    try {
      return await contract.getOwnerAgents(ownerAddress)
    } catch (err) {
      console.error('[CONTRACTS] getOwnerAgents error:', err.message)
      return []
    }
  }

  async isAgentActive(agentId) {
    if (this._mockMode) return true
    const contract = this._requireContract('agentRegistry')
    try {
      return await contract.isActive(agentId)
    } catch {
      return false
    }
  }

  async verifyPaymentTransaction(txHash, expectedAmountEth) {
    if (this._mockMode) {
      console.warn('[CONTRACTS MOCK] verifyPaymentTransaction — returning true')
      return { verified: true, mock: true }
    }

    if (!this.provider) return { verified: false, error: 'No provider' }

    try {
      const [tx, receipt] = await Promise.all([
        this.provider.getTransaction(txHash),
        this.provider.getTransactionReceipt(txHash),
      ])

      if (!tx) return { verified: false, error: 'Transaction not found' }
      if (!receipt) return { verified: false, error: 'Transaction not mined yet' }
      if (receipt.status !== 1) return { verified: false, error: 'Transaction failed on-chain' }

      const paidEth = parseFloat(ethers.formatEther(tx.value))
      if (paidEth < expectedAmountEth) {
        return { verified: false, error: `Underpayment: expected ${expectedAmountEth} ETH, received ${paidEth} ETH` }
      }

      return { verified: true, paidEth, blockNumber: receipt.blockNumber, gasUsed: receipt.gasUsed.toString() }
    } catch (err) {
      console.error('[CONTRACTS] verifyPaymentTransaction error:', err.message)
      return { verified: false, error: err.message }
    }
  }

  async getContractBalance(walletAddress) {
    if (this._mockMode || !this.payment) return '0'
    try {
      const bal = await this.payment.getBalance(walletAddress)
      return ethers.formatEther(bal)
    } catch {
      return '0'
    }
  }

  async getAgentRevenue(agentId) {
    if (this._mockMode || !this.payment) return '0'
    try {
      const rev = await this.payment.getAgentRevenue(agentId)
      return ethers.formatEther(rev)
    } catch {
      return '0'
    }
  }

  async getPlatformFee() {
    if (this._mockMode || !this.payment) return config.platform.feePercent
    try {
      const fee = await this.payment.platformFeePercent()
      return Number(fee)
    } catch {
      return config.platform.feePercent
    }
  }

  async getVoteCounts(agentId) {
    if (this._mockMode || !this.voting) return { upvotes: 0, downvotes: 0 }
    try {
      const result = await this.voting.getVotes(agentId)
      return { upvotes: Number(result.upvotes), downvotes: Number(result.downvotes) }
    } catch (err) {
      console.error('[CONTRACTS] getVoteCounts error:', err.message)
      return { upvotes: 0, downvotes: 0 }
    }
  }

  async getVoteScore(agentId) {
    if (this._mockMode || !this.voting) return 0
    try {
      const score = await this.voting.getVoteScore(agentId)
      return Number(score)
    } catch {
      return 0
    }
  }

  async getVoterStatus(agentId, voterAddress) {
    if (this._mockMode || !this.voting) return 0
    try {
      const status = await this.voting.hasVoted(agentId, voterAddress)
      return Number(status)
    } catch {
      return 0
    }
  }

  async getEthBalance(address) {
    if (this._mockMode || !this.provider) return '0'
    try {
      const balance = await this.provider.getBalance(address)
      return ethers.formatEther(balance)
    } catch {
      return '0'
    }
  }

  async getBlockNumber() {
    if (this._mockMode || !this.provider) return 0
    try {
      return await this.provider.getBlockNumber()
    } catch {
      return 0
    }
  }

  async getGasPrice() {
    if (this._mockMode || !this.provider) return '0'
    try {
      const feeData = await this.provider.getFeeData()
      return ethers.formatUnits(feeData.gasPrice || 0n, 'gwei')
    } catch {
      return '0'
    }
  }

  onPaymentProcessed(callback) {
    if (this._mockMode || !this.payment) return () => {}

    const handler = (agentId, caller, agentOwner, amount, platformFee, ownerAmount, event) => {
      callback({
        agentId,
        caller,
        agentOwner,
        amount: parseFloat(ethers.formatEther(amount)),
        platformFee: parseFloat(ethers.formatEther(platformFee)),
        ownerAmount: parseFloat(ethers.formatEther(ownerAmount)),
        txHash: event.log.transactionHash,
        blockNumber: event.log.blockNumber,
      })
    }

    this.payment.on('PaymentProcessed', handler)
    return () => this.payment.off('PaymentProcessed', handler)
  }

  onAgentRegistered(callback) {
    if (this._mockMode || !this.agentRegistry) return () => {}

    const handler = (agentId, owner, pricing, timestamp, event) => {
      callback({
        agentId,
        owner,
        pricing: parseFloat(ethers.formatEther(pricing)),
        timestamp: Number(timestamp),
        txHash: event.log.transactionHash,
      })
    }

    this.agentRegistry.on('AgentRegistered', handler)
    return () => this.agentRegistry.off('AgentRegistered', handler)
  }

  onVoted(callback) {
    if (this._mockMode || !this.voting) return () => {}

    const handler = (agentId, voter, upvote, timestamp, event) => {
      callback({
        agentId,
        voter,
        upvote,
        timestamp: Number(timestamp),
        txHash: event.log.transactionHash,
      })
    }

    this.voting.on('Voted', handler)
    return () => this.voting.off('Voted', handler)
  }

  startAllListeners(prisma) {
    if (this._mockMode) {
      console.log('[CONTRACTS] Mock mode — skipping event listeners')
      return
    }

    const stopPayment = this.onPaymentProcessed(async (event) => {
      console.log(`[EVENT] PaymentProcessed — Agent: ${event.agentId}, Amount: ${event.amount} ETH`)
      try {
        const agent = await prisma.agent.findFirst({ where: { agentId: event.agentId } })
        if (agent) {
          await prisma.agent.update({ where: { id: agent.id }, data: { revenue: { increment: event.ownerAmount } } })
          await prisma.usageMetrics.update({ where: { agentId: agent.id }, data: { revenue: { increment: event.ownerAmount } } })
        }
      } catch (err) {
        console.error('[EVENT] PaymentProcessed sync error:', err.message)
      }
    })

    const stopRegistry = this.onAgentRegistered((event) => {
      console.log(`[EVENT] AgentRegistered on-chain — ${event.agentId} by ${event.owner}`)
    })

    console.log('[CONTRACTS] ✅ Event listeners started')

    return () => {
      stopPayment()
      stopRegistry()
    }
  }

  async getNetworkInfo() {
    if (this._mockMode || !this.provider) return { name: 'mock', chainId: 0, mockMode: true }
    try {
      const network = await this.provider.getNetwork()
      const blockNumber = await this.provider.getBlockNumber()
      const gasPrice = await this.getGasPrice()
      return {
        name: network.name,
        chainId: Number(network.chainId),
        blockNumber,
        gasPrice: `${gasPrice} gwei`,
        mockMode: false,
      }
    } catch (err) {
      return { error: err.message }
    }
  }
}

export default new ContractManager()