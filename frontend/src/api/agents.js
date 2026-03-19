import api from './axios'

export const agentsAPI = {
  getAll: (params) => api.get('/agents', { params }),
  getById: (id) => api.get(`/agents/${id}`),
  
  // Deployment State Machine Endpoints
  deploy: (data) => api.post('/agents/deploy', data), // Creates DB-only OR "DRAFT" on-chain agent
  confirmDeploy: (id, txHash) => api.post(`/agents/${id}/confirm`, { txHash }), // Marks DRAFT as ACTIVE
  cancelDraft: (id) => api.delete(`/agents/${id}/draft`), // Rollback if wallet tx fails
  
  execute: (id, task) => api.post(`/agents/${id}/execute`, { task }),
  vote: (id, vote) => api.post(`/agents/${id}/vote`, { vote }),
  getMetrics: (id) => api.get(`/agents/${id}/metrics`),
  search: (query) => api.get('/agents/search', { params: { q: query } }),
}