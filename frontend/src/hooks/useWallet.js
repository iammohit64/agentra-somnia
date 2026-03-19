import { useState, useCallback } from 'react'
import { ethers } from 'ethers'
import { useAuthStore } from '../stores/authStore'

export function useWallet() {
  const { setWallet, setBalance, setConnecting, disconnect, isConnecting } = useAuthStore()
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
      const network = await provider.getNetwork()
      const balance = await provider.getBalance(accounts[0])
      setWallet(accounts[0], Number(network.chainId))
      setBalance(ethers.formatEther(balance))
      localStorage.setItem('wallet-address', accounts[0])
    } catch (err) {
      setError(err.message)
    } finally {
      setConnecting(false)
    }
  }, [setWallet, setBalance, setConnecting])

  const disconnectWallet = useCallback(() => {
    localStorage.removeItem('wallet-address')
    disconnect()
  }, [disconnect])

  return { connect, disconnect: disconnectWallet, isConnecting, error }
}