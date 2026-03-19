import { defaultWagmiConfig } from '@web3modal/wagmi/react/config'
import { createWeb3Modal } from '@web3modal/wagmi/react'
import { SUPPORTED_CHAINS } from './chains.config'

export const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID

export const config = defaultWagmiConfig({
  chains: SUPPORTED_CHAINS,
  projectId,
  metadata: {
    name: 'Agentra',
    description: 'Decentralized AI Agent Marketplace',
    url: 'https://agentra.io',
    icons: ['https://avatars.githubusercontent.com/u/37784886']
  },
})

createWeb3Modal({
  wagmiConfig: config,
  projectId,
  enableAnalytics: true,
})