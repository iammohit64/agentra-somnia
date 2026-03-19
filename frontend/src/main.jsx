import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { config } from './config/web3.js' // <-- Add this
import NetworkEnforcer from './components/layouts/NetworkEnforcer.jsx' // <-- Add this
import './index.css'
import App from './App.jsx'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <NetworkEnforcer>
          <App />
        </NetworkEnforcer>
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>,
)