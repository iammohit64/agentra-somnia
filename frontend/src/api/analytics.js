import api from './axios'

export const analyticsAPI = {
  getLeaderboard: () => api.get('/leaderboard'),
  getDashboard: (wallet) => api.get('/analytics/dashboard', { params: { wallet } }),
  getGlobalStats: () => api.get('/analytics/global'),
}