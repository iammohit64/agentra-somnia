import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      walletAddress: null,
      isConnected: false,
      chainId: null,
      balance: null,
      isConnecting: false,

      setWallet: (address, chainId) => set({
        walletAddress: address,
        isConnected: true,
        chainId,
      }),

      setBalance: (balance) => set({ balance }),
      setConnecting: (v) => set({ isConnecting: v }),

      disconnect: () => set({
        walletAddress: null,
        isConnected: false,
        chainId: null,
        balance: null,
      }),

      shortAddress: () => {
        const addr = get().walletAddress
        if (!addr) return null
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`
      },
    }),
    { name: 'auth-store' }
  )
)