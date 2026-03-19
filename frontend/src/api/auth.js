import api from './axios'

export const authAPI = {
  getNonce: (walletAddress) =>
    api.get(`/auth/nonce/${walletAddress}`),

  verifyWallet: (walletAddress, signature, message) =>
    api.post('/auth/verify-wallet', {
      walletAddress,
      signature,
      message,
    }),
}