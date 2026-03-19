import { v4 as uuidv4 } from 'uuid'
import axios from 'axios'
import prisma from '../lib/prisma.js'
import agentService from './agentService.js'
import contractManager from '../blockchain/contracts.js'
import config from '../config/config.js'

class OrchestratorService {
  constructor() {
    this.activeChains = new Map()
    this.activeTimers = new Map()
    this.stats = {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      agentToAgentCalls: 0,
    }
  }

  async executeAgent(agentId, task, callerWallet, options = {}) {
    const {
      callDepth = 0,
      parentInteractionId = null,
      txHash = null,
      callChainId = uuidv4(),
    } = options

    this.stats.totalExecutions++

    if (callDepth > config.platform.maxCallDepth) {
      this.stats.failedExecutions++
      throw this._err(`Max call depth exceeded (limit: ${config.platform.maxCallDepth})`, 429)
    }

    this._checkAndRegisterChain(callChainId, agentId)

    const agent = await this._loadAgent(agentId)

    const paymentResult = await this._verifyPayment(txHash, agent.pricing)

    if (agent.status === 'active') {
      prisma.agent.update({
        where: { id: agent.id },
        data: { status: 'busy' },
      }).catch(() => {})
    }

    const interactionRecord = await this._createInteractionRecord({
      agentId: agent.id,
      callerWallet,
      task,
      txHash,
      callDepth,
      parentInteractionId,
    })

    const startTime = Date.now()
    let response, success, errorMessage

    try {
      response = await this._callWithTimeout(agent.endpoint, task, {
        callDepth,
        callChainId,
        interactionId: interactionRecord?.id,
        agentName: agent.name,
      })
      success = true
    } catch (err) {
      success = false
      errorMessage = err.message
      this.stats.failedExecutions++

      await this._finalizeInteraction(interactionRecord?.id, {
        status: 'failed',
        latency: Date.now() - startTime,
        errorMessage,
      })

      prisma.agent.update({
        where: { id: agent.id },
        data: { status: 'active' },
      }).catch(() => {})

      this._releaseChain(callChainId, agentId)
      throw this._err(`Agent execution failed: ${err.message}`, 502)
    }

    const latency = Date.now() - startTime

    await this._finalizeInteraction(interactionRecord?.id, {
      status: 'success',
      response: this._serializeResponse(response),
      latency,
    })

    const revenue = paymentResult.verified
      ? agent.pricing * (1 - config.platform.feePercent / 100)
      : 0

    await agentService.recordExecution(agent.id, { success, latency, revenue })

    if (txHash && paymentResult.verified) {
      await this._logTransaction({
        txHash,
        agentId: agent.id,
        callerWallet,
        ownerWallet: agent.ownerWallet,
        amount: agent.pricing,
        type: callDepth > 0 ? 'agent_to_agent' : 'call',
      })
    }

    prisma.agent.update({
      where: { id: agent.id },
      data: { status: 'active' },
    }).catch(() => {})

    this._releaseChain(callChainId, agentId)

    this.stats.successfulExecutions++
    if (callDepth > 0) this.stats.agentToAgentCalls++

    return {
      interactionId: interactionRecord?.id,
      agentId: agent.agentId,
      agentName: agent.name,
      task,
      response,
      latency,
      success: true,
      callDepth,
      callChainId,
      paymentVerified: paymentResult.verified,
      timestamp: new Date().toISOString(),
    }
  }

  async executeSequential(agentJobs, callerWallet, options = {}) {
    const callChainId = options.callChainId || uuidv4()
    const results = []
    let context = ''

    for (let i = 0; i < agentJobs.length; i++) {
      const { agentId, task, txHash } = agentJobs[i]

      const enrichedTask = context
        ? `${task}\n\n---\nContext from previous agent:\n${context}`
        : task

      const result = await this.executeAgent(agentId, enrichedTask, callerWallet, {
        txHash,
        callChainId,
        callDepth: i,
        parentInteractionId: results[i - 1]?.interactionId || null,
      })

      results.push(result)
      context = this._serializeResponse(result.response)
    }

    return {
      mode: 'sequential',
      callChainId,
      steps: agentJobs.length,
      results,
    }
  }

  async executeParallel(agentJobs, callerWallet, options = {}) {
    const callChainId = options.callChainId || uuidv4()

    const promises = agentJobs.map((job, i) =>
      this.executeAgent(job.agentId, job.task, callerWallet, {
        txHash: job.txHash,
        callChainId,
        callDepth: i,
      })
    )

    const settled = await Promise.allSettled(promises)

    const results = settled.map((r, i) => ({
      index: i,
      agentId: agentJobs[i].agentId,
      success: r.status === 'fulfilled',
      result: r.status === 'fulfilled' ? r.value : null,
      error: r.status === 'rejected' ? r.reason?.message : null,
    }))

    return {
      mode: 'parallel',
      callChainId,
      total: agentJobs.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
    }
  }

  async getInteractionHistory(agentId, options = {}) {
    const {
      limit = 50,
      callerWallet = null,
      status = null,
      fromDate = null,
    } = options

    const where = { agentId }
    if (callerWallet) where.callerWallet = callerWallet.toLowerCase()
    if (status) where.status = status
    if (fromDate) where.createdAt = { gte: new Date(fromDate) }

    return prisma.interaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 200),
      select: {
        id: true,
        callerWallet: true,
        task: true,
        latency: true,
        status: true,
        callDepth: true,
        parentInteractionId: true,
        errorMessage: true,
        createdAt: true,
      },
    })
  }

  async getCallChain(interactionId) {
    const root = await prisma.interaction.findUnique({
      where: { id: interactionId },
      include: { agent: { select: { name: true, agentId: true } } },
    })
    if (!root) return null

    const buildTree = async (id) => {
      const node = await prisma.interaction.findUnique({
        where: { id },
        include: { agent: { select: { name: true, agentId: true } } },
      })
      if (!node) return null

      const children = await prisma.interaction.findMany({
        where: { parentInteractionId: id },
        include: { agent: { select: { name: true, agentId: true } } },
      })

      return {
        ...node,
        children: await Promise.all(children.map(c => buildTree(c.id))),
      }
    }

    return buildTree(interactionId)
  }

  getStats() {
    return {
      ...this.stats,
      activeChainsCount: this.activeChains.size,
      activeTimersCount: this.activeTimers.size,
      successRate: this.stats.totalExecutions > 0
        ? parseFloat(
            (this.stats.successfulExecutions / this.stats.totalExecutions * 100).toFixed(2)
          )
        : 100,
    }
  }

  async _loadAgent(agentId) {
    const agent = await agentService.getById(agentId)

    if (!agent) throw this._err('Agent not found', 404)
    if (agent.status === 'offline') throw this._err(`Agent "${agent.name}" is offline`, 503)
    if (agent.status === 'inactive') throw this._err(`Agent "${agent.name}" is inactive`, 503)

    return agent
  }

  async _verifyPayment(txHash, expectedAmountEth) {
    if (!txHash) {
      if (config.nodeEnv === 'production') {
        throw this._err('Transaction hash required for execution in production', 402)
      }
      return { verified: true, mock: true, reason: 'No txHash in dev mode' }
    }

    const result = await contractManager.verifyPaymentTransaction(txHash, expectedAmountEth)

    if (!result.verified) {
      if (config.nodeEnv === 'production') {
        throw this._err(`Payment verification failed: ${result.error}`, 402)
      }
      console.warn('[ORCHESTRATOR] Payment verification failed (dev bypass):', result.error)
      return { verified: true, mock: true, reason: result.error }
    }

    return result
  }

  async _createInteractionRecord({ agentId, callerWallet, task, txHash, callDepth, parentInteractionId }) {
    try {
      return await prisma.interaction.create({
        data: {
          agentId,
          callerWallet: callerWallet?.toLowerCase() || null,
          task: task?.slice(0, 10000) || null,
          txHash: txHash || null,
          callDepth,
          parentInteractionId,
          status: 'success',
        },
      })
    } catch (err) {
      console.error('[ORCHESTRATOR] Failed to create interaction record:', err.message)
      return null
    }
  }

  async _finalizeInteraction(interactionId, updates) {
    if (!interactionId) return
    try {
      await prisma.interaction.update({
        where: { id: interactionId },
        data: {
          ...updates,
          response: updates.response
            ? updates.response.slice(0, 50000)
            : undefined,
        },
      })
    } catch (err) {
      console.error('[ORCHESTRATOR] Failed to finalize interaction:', err.message)
    }
  }

  async _callWithTimeout(endpoint, task, meta = {}) {
    const timeout = config.platform.callTimeoutMs
    const controller = new AbortController()
    const timerId = setTimeout(() => controller.abort(), timeout)

    const interactionId = meta.interactionId
    if (interactionId) {
      this.activeTimers.set(interactionId, { controller, timerId })
    }

    const payload = {
      task,
      meta: {
        platform: 'neural-market',
        version: '1.0',
        callDepth: meta.callDepth,
        callChainId: meta.callChainId,
        timestamp: new Date().toISOString(),
      },
    }

    const endpoints = [
      `${endpoint}/execute`,
      `${endpoint}/run`,
      endpoint,
    ]

    let lastError
    for (const url of endpoints) {
      try {
        const res = await axios.post(url, payload, {
          timeout,
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            'X-Neural-Market': '1',
            'X-Call-Chain': meta.callChainId || '',
          },
          validateStatus: (s) => s < 500,
        })

        clearTimeout(timerId)
        if (interactionId) this.activeTimers.delete(interactionId)

        if (res.status >= 400) {
          throw new Error(`Agent responded with HTTP ${res.status}: ${JSON.stringify(res.data)}`)
        }

        return res.data
      } catch (err) {
        if (axios.isCancel(err) || err.code === 'ERR_CANCELED') {
          clearTimeout(timerId)
          if (interactionId) this.activeTimers.delete(interactionId)
          throw new Error(`Execution timed out after ${timeout}ms`)
        }
        if (err.response?.status === 404) {
          lastError = err
          continue
        }
        clearTimeout(timerId)
        if (interactionId) this.activeTimers.delete(interactionId)
        throw err
      }
    }

    clearTimeout(timerId)
    if (interactionId) this.activeTimers.delete(interactionId)
    throw lastError || new Error('All agent endpoints returned 404')
  }

  async _logTransaction({ txHash, agentId, callerWallet, ownerWallet, amount, type }) {
    try {
      await prisma.user.upsert({
        where: { walletAddress: callerWallet || 'anonymous' },
        update: {},
        create: { walletAddress: callerWallet || 'anonymous' },
      })

      await prisma.transaction.upsert({
        where: { txHash },
        update: {},
        create: {
          txHash,
          agentId,
          callerWallet: callerWallet || 'anonymous',
          ownerWallet,
          amount,
          platformFee: amount * (config.platform.feePercent / 100),
          type,
          status: 'confirmed',
        },
      })
    } catch (err) {
      if (!err.message?.includes('Unique constraint')) {
        console.error('[ORCHESTRATOR] Transaction log error:', err.message)
      }
    }
  }

  _checkAndRegisterChain(callChainId, agentId) {
    if (!this.activeChains.has(callChainId)) {
      this.activeChains.set(callChainId, new Set())
    }
    const chain = this.activeChains.get(callChainId)
    if (chain.has(agentId)) {
      throw this._err(`Circular agent call detected: agent "${agentId}" already in this chain`, 400)
    }
    chain.add(agentId)
  }

  _releaseChain(callChainId, agentId) {
    const chain = this.activeChains.get(callChainId)
    if (chain) {
      chain.delete(agentId)
      if (chain.size === 0) {
        this.activeChains.delete(callChainId)
      }
    }
  }

  _serializeResponse(response) {
    if (typeof response === 'string') return response
    if (response === null || response === undefined) return ''
    try {
      return JSON.stringify(response)
    } catch {
      return String(response)
    }
  }

  _err(message, status = 500) {
    const err = new Error(message)
    err.status = status
    return err
  }

  cancelExecution(interactionId) {
    const timer = this.activeTimers.get(interactionId)
    if (timer) {
      timer.controller.abort()
      clearTimeout(timer.timerId)
      this.activeTimers.delete(interactionId)
      return true
    }
    return false
  }
}

export default new OrchestratorService()