import { baseSepolia, arbitrumSepolia } from 'wagmi/chains'
import { monadTestnet, polkadotTestnet } from './custom-chains'
import deployments from '../deployments.json'

// 1. Export the array for Wagmi to initialize
// (Added polkadotTestnet here!)
export const SUPPORTED_CHAINS = [baseSepolia, arbitrumSepolia, monadTestnet, polkadotTestnet]

// 2. Export the dynamic lookup map for your React components
export const CHAIN_CONFIG = SUPPORTED_CHAINS.reduce((acc, chain) => {
  acc[chain.id] = {
    chain,
    contracts: deployments[chain.id] || {},
  }
  return acc
}, {})