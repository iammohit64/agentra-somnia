import { useState, useCallback } from 'react'
import { ethers } from 'ethers'
import { useAuthStore } from '../stores/authStore'

export function useWallet() {
  const {
    setWallet,
    setBalance,
    setConnecting,
    disconnect,
    isConnecting,
  } = useAuthStore()

  const [error, setError] = useState(null)

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      setError('MetaMask not found. Please install it.')
      return
    }

    setConnecting(true)
    setError(null)

    try {
      const provider = new ethers.BrowserProvider(window.ethereum)

      const accounts = await provider.send('eth_requestAccounts', [])
      const signer = await provider.getSigner()
      const network = await provider.getNetwork()

      const address = accounts[0]

      // Native balance (ETH) - optional
      const ethBalance = await provider.getBalance(address)

      setWallet(address, Number(network.chainId))
      setBalance({
        eth: ethers.formatEther(ethBalance),
      })

      localStorage.setItem('wallet-address', address)

      // Listen for account changes
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
          disconnect()
        } else {
          setWallet(accounts[0], Number(network.chainId))
          localStorage.setItem('wallet-address', accounts[0])
        }
      })

      // Listen for network changes
      window.ethereum.on('chainChanged', () => {
        window.location.reload()
      })
    } catch (err) {
      setError(err.message || 'Wallet connection failed')
    } finally {
      setConnecting(false)
    }
  }, [setWallet, setBalance, setConnecting, disconnect])

  const disconnectWallet = useCallback(() => {
    localStorage.removeItem('wallet-address')
    disconnect()
  }, [disconnect])

  return {
    connect,
    disconnect: disconnectWallet,
    isConnecting,
    error,
  }
}