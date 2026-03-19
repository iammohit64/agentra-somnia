import axios from 'axios'
import prisma from '../lib/prisma.js'
import agentService from '../services/agentService.js'
import blockchainService from '../services/blockchainService.js'
import config from '../config/config.js'
import { v4 as uuidv4 } from 'uuid'

class Orchestrator {
  constructor() {
    this.activeChains = new Map() // callChainId -> Set of agentIds
  }

  /**
   * Main execution entry point
   */
  async executeAgent(agentId, task, callerWallet, options = {}) {
    const {
      callDepth = 0,
      parentInteractionId = null,
      txHash = null,
      callChainId = uuidv4(),
    } = options

    // ── 1. Loop / depth guard ──────────────────────────────
    if (callDepth > config.platform.maxCallDepth) {
      throw Object.assign(
        new Error(`Max call depth (${config.platform.maxCallDepth}) exceeded`),
        { status: 429 }
      )
    }

    // Track call chain for loop detection
    if (!this.activeChains.has(callChainId)) {
      this.activeChains.set(callChainId, new Set())
    }
    const chain = this.activeChains.get(callChainId)
    if (chain.has(agentId)) {
      throw Object.assign(
        new Error(`Circular agent call detected: ${agentId} already in chain`),
        { status: 400 }
      )
    }
    chain.add(agentId)

    // ── 2. Load agent ──────────────────────────────────────
    const agent = await agentService.getById(agentId)
    if (agent.status === 'offline' || agent.status === 'inactive') {
      throw Object.assign(new Error(`Agent "${agent.name}" is ${agent.status}`), { status: 503 })
    }

    // ── 3. Verify payment ──────────────────────────────────
    let paymentVerified = false
    let verifiedTxHash = txHash
    if (txHash) {
      try {
        paymentVerified = await blockchainService.verifyTransaction(txHash, agent.pricing)
        verifiedTxHash = txHash
      } catch (err) {
        console.warn('[ORCHESTRATOR] Payment verification failed (continuing in dev mode):', err.message)
        if (config.nodeEnv === 'production') {
          throw Object.assign(new Error('Payment verification failed'), { status: 402 })
        }
        paymentVerified = true // dev fallback
      }
    } else {
      if (config.nodeEnv === 'production') {
        throw Object.assign(new Error('Transaction hash required for execution'), { status: 402 })
      }
      paymentVerified = true // dev fallback
    }

    // ── 4. Create interaction record ───────────────────────
    const interactionId = uuidv4()
    const startTime = Date.now()
    let interactionRecord

    try {
      interactionRecord = await prisma.interaction.create({
        data: {
          agentId: agent.id,
          callerWallet: callerWallet?.toLowerCase() || null,
          task,
          txHash: verifiedTxHash || null,
          callDepth,
          parentInteractionId,
          status: 'success',
        },
      })
    } catch (err) {
      console.error('[ORCHESTRATOR] Failed to create interaction record:', err.message)
    }

    // ── 5. Call agent endpoint ─────────────────────────────
    let response
    let success = false
    try {
      const result = await this._callAgentEndpoint(agent.endpoint, task, {
        callDepth,
        callChainId,
        interactionId: interactionRecord?.id,
      })
      response = result.data
      success = true
    } catch (err) {
      // Update interaction as failed
      if (interactionRecord) {
        await prisma.interaction.update({
          where: { id: interactionRecord.id },
          data: {
            status: 'failed',
            errorMessage: err.message,
            latency: Date.now() - startTime,
          },
        })
      }
      chain.delete(agentId)
      if (chain.size === 0) this.activeChains.delete(callChainId)
      throw Object.assign(
        new Error(`Agent execution failed: ${err.message}`),
        { status: 502 }
      )
    }

    const latency = Date.now() - startTime

    // ── 6. Update interaction + metrics ───────────────────
    const revenue = paymentVerified
      ? agent.pricing * (1 - config.platform.feePercent / 100)
      : 0

    if (interactionRecord) {
      await prisma.interaction.update({
        where: { id: interactionRecord.id },
        data: {
          response: typeof response === 'string' ? response : JSON.stringify(response),
          latency,
          status: 'success',
        },
      })
    }

    await agentService.recordExecution(agent.id, { success, latency, revenue })

    // Log transaction
    if (verifiedTxHash) {
      try {
        await prisma.transaction.create({
          data: {
            txHash: verifiedTxHash,
            agentId: agent.id,
            callerWallet: callerWallet?.toLowerCase() || 'anonymous',
            ownerWallet: agent.ownerWallet,
            amount: agent.pricing,
            platformFee: agent.pricing * (config.platform.feePercent / 100),
            type: callDepth > 0 ? 'agent_to_agent' : 'call',
            status: 'confirmed',
          },
        })
      } catch (err) {
        console.warn('[ORCHESTRATOR] Transaction log failed (duplicate hash?):', err.message)
      }
    }

    // ── 7. Cleanup chain tracker ───────────────────────────
    chain.delete(agentId)
    if (chain.size === 0) this.activeChains.delete(callChainId)

    return {
      interactionId: interactionRecord?.id,
      agentId: agent.agentId,
      agentName: agent.name,
      task,
      response,
      latency,
      success: true,
      callDepth,
      timestamp: new Date().toISOString(),
    }
  }

  /**
   * Agent-to-agent call (used by agents internally)
   */
  async agentToAgentCall(fromAgentId, toAgentId, task, parentOptions = {}) {
    return this.executeAgent(toAgentId, task, null, {
      ...parentOptions,
      callDepth: (parentOptions.callDepth || 0) + 1,
    })
  }

  /**
   * Internal HTTP call to agent endpoint
   */
  async _callAgentEndpoint(endpoint, task, meta = {}) {
    const timeout = config.platform.callTimeoutMs

    const payload = {
      task,
      meta: {
        platform: 'neural-market',
        version: '1.0',
        ...meta,
      },
    }

    // Try MCP-style POST first
    try {
      return await axios.post(`${endpoint}/execute`, payload, {
        timeout,
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (err) {
      // If 404, try root endpoint
      if (err.response?.status === 404) {
        return await axios.post(endpoint, payload, {
          timeout,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      throw err
    }
  }

  /**
   * Get execution history for an agent
   */
  async getInteractionHistory(agentId, limit = 50) {
    return prisma.interaction.findMany({
      where: { agentId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        callerWallet: true,
        task: true,
        latency: true,
        status: true,
        callDepth: true,
        createdAt: true,
      },
    })
  }
}

export default new Orchestrator()