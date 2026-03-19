import api from './axios'

export const agentsAPI = {
  getAll: (params) => api.get('/agents', { params }),

  getById: (id) => api.get(`/agents/${id}`),

  // ─────────────────────────────────────────────
  // DEPLOY AGENT (BLOCKCHAIN FLOW)
  // ─────────────────────────────────────────────
  deploy: (data) =>
    api.post('/agents/deploy', {
      name: data.name,
      description: data.description,
      metadataUri: data.metadataUri,
      endpoint: data.endpoint,
      tier: data.tier, // 0 | 1 | 2
      pricing: data.pricing, // wei string
      tags: data.tags || [],
      category: data.category,
    }),

  confirmDeploy: (id, txHash, contractAgentId) =>
    api.post(`/agents/${id}/confirm`, {
      txHash,
      contractAgentId,
    }),

  cancelDraft: (id) => api.delete(`/agents/${id}/draft`),

  // ─────────────────────────────────────────────
  // ACCESS PURCHASE
  // ─────────────────────────────────────────────
  purchaseAccess: (id, isLifetime, txHash) =>
    api.post(`/agents/${id}/purchase`, {
      isLifetime,
      txHash,
    }),

  // ─────────────────────────────────────────────
  // UPVOTE (PAID)
  // ─────────────────────────────────────────────
  upvote: (id, txHash) =>
    api.post(`/agents/${id}/upvote`, {
      txHash,
    }),

  // ─────────────────────────────────────────────
  // EXECUTION (NO TOKEN)
  // ─────────────────────────────────────────────
  execute: (id, task) =>
    api.post(`/agents/${id}/execute`, { task }),

  // ─────────────────────────────────────────────
  // ANALYTICS
  // ─────────────────────────────────────────────
  getMetrics: (id) => api.get(`/agents/${id}/metrics`),

  search: (query) =>
    api.get('/agents/search', { params: { q: query } }),
}