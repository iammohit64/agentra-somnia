import api from './axios'

export const analyticsAPI = {
  getLeaderboard: () => api.get('/analytics/leaderboard'),

  getDashboard: (wallet) =>
    api.get('/analytics/dashboard', {
      params: { wallet },
      headers: {
        'x-wallet-address': wallet,
      },
    }),

  getGlobalStats: () => api.get('/analytics/global'),
}