import api from './axios'

export const authAPI = {
  verifyWallet: (address, signature, message) =>
    api.post('/auth/verify-wallet', { address, signature, message }),
  getNonce: (address) => api.get(`/auth/nonce/${address}`),
}