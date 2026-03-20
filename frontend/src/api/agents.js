import api from './axios'

export const agentsAPI = {
  // ─────────────────────────────────────────────
  // READ
  // ─────────────────────────────────────────────
  getAll: (params) => api.get('/agents', { params }),

  getById: (id) => api.get(`/agents/${id}`),

  search: (query) => api.get('/agents/search', { params: { q: query } }),

  getMetrics: (id) => api.get(`/agents/${id}/metrics`),

  checkAccess: (agentId) => api.get(`/agents/${agentId}/access`),

  checkUpvoteStatus: (agentId) => api.get(`/agents/${agentId}/upvote-status`),

  // ─────────────────────────────────────────────
  // DEPLOY AGENT FLOW
  // ─────────────────────────────────────────────

  /**
   * Create agent record.
   * pricing = monthly price in wei (string)
   * lifetimeMultiplier = how many months = 1 lifetime (default 12)
   */
  deploy: (data) =>
    api.post('/agents/deploy', {
      name: data.name,
      description: data.description,
      endpoint: data.endpoint,
      tier: data.tier,
      pricing: data.pricing,              // monthly price in wei string
      lifetimeMultiplier: data.lifetimeMultiplier ?? 12,
      tags: data.tags || [],
      category: data.category,
      mcpSchema: data.mcpSchema || undefined,
      deployMode: data.deployMode || 'database',
    }),

  /**
   * After on-chain tx confirmed, tell backend to activate the draft.
   */
  confirmDeploy: (id, txHash, contractAgentId) =>
    api.post(`/agents/${id}/confirm`, {
      txHash,
      contractAgentId: contractAgentId ? String(contractAgentId) : undefined,
    }),

  cancelDraft: (id) => api.delete(`/agents/${id}/draft`),

  // ─────────────────────────────────────────────
  // ACCESS PURCHASE
  // ─────────────────────────────────────────────

  /**
   * Record a completed purchase.
   * For blockchain agents: txHash is required (wallet tx done client-side).
   * For DB agents: no txHash needed.
   */
  purchaseAccess: (agentId, isLifetime, txHash) =>
    api.post(`/agents/${agentId}/purchase`, {
      isLifetime,
      txHash: txHash || undefined,
    }),

  // ─────────────────────────────────────────────
  // UPVOTE (paid on blockchain, free on DB)
  // ─────────────────────────────────────────────

  /**
   * Upvote an agent.
   * For blockchain agents: txHash is required (AGT transfer done client-side).
   * For DB agents: no txHash needed (free, deduplicated by wallet).
   */
  upvote: (agentId, txHash) =>
    api.post(`/agents/${agentId}/upvote`, { txHash: txHash || undefined }),

  // ─────────────────────────────────────────────
  // EXECUTION
  // ─────────────────────────────────────────────

  execute: (id, task) =>
    api.post(`/agents/${id}/execute`, { task }),

  // ─────────────────────────────────────────────
  // REVIEWS
  // ─────────────────────────────────────────────

  getReviews: (agentId, page = 1) =>
    api.get(`/agents/${agentId}/reviews`, { params: { page } }),

  createReview: (agentId, data) =>
    api.post(`/agents/${agentId}/reviews`, data),

  likeReview: (reviewId) =>
    api.post(`/reviews/${reviewId}/like`),

  deleteReview: (reviewId) =>
    api.delete(`/reviews/${reviewId}`),

  // ─────────────────────────────────────────────
  // MANAGEMENT
  // ─────────────────────────────────────────────

  update: (id, data) => api.put(`/agents/${id}`, data),

  deactivate: (id) => api.delete(`/agents/${id}`),

  validateEndpoint: (endpoint) =>
    api.post('/agents/validate-endpoint', { endpoint }),
}