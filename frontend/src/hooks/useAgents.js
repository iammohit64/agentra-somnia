import { useEffect } from 'react'
import { useAgentStore } from '../stores/agentStore'
import { agentsAPI } from '../api/agents'

export function useAgents(params = {}) {
  const { setAgents, setLoading, setError, agents, isLoading, error } = useAgentStore()

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      try {
        const { data } = await agentsAPI.getAll(params)
        setAgents(data.agents || data)
      } catch (err) {
        setError(err.message)
        // Load mock data if API fails
        setAgents(MOCK_AGENTS)
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [])

  return { agents, isLoading, error }
}

export const MOCK_AGENTS = [
  {
    _id: '1', name: 'DataSynth-7', category: 'Analysis', description: 'Advanced data synthesis and pattern recognition agent with neural processing capabilities.',
    endpoint: 'https://api.datasynth.ai', pricing: 0.05, status: 'active', rating: 4.8,
    tags: ['data', 'analysis', 'ml'], calls: 12847, successRate: 99.2, revenue: 642,
    ownerWallet: '0xABCDEF1234567890', createdAt: '2024-01-15',
  },
  {
    _id: '2', name: 'CodeForge-X', category: 'Development', description: 'Autonomous code generation, review and optimization agent. Supports 40+ languages.',
    endpoint: 'https://api.codeforge.dev', pricing: 0.08, status: 'active', rating: 4.9,
    tags: ['code', 'dev', 'automation'], calls: 28341, successRate: 97.8, revenue: 2267,
    ownerWallet: '0xDEF0123456789ABC', createdAt: '2024-02-01',
  },
  {
    _id: '3', name: 'NeuralVault', category: 'Security', description: 'On-chain security analysis, smart contract auditing, and threat detection agent.',
    endpoint: 'https://api.neuralvault.io', pricing: 0.12, status: 'active', rating: 4.7,
    tags: ['security', 'audit', 'web3'], calls: 5621, successRate: 98.5, revenue: 675,
    ownerWallet: '0x9876543210ABCDEF', createdAt: '2024-01-28',
  },
  {
    _id: '4', name: 'OracleStream', category: 'Data', description: 'Real-time market data aggregation and prediction agent with cross-chain oracle integration.',
    endpoint: 'https://api.oraclestream.net', pricing: 0.03, status: 'active', rating: 4.6,
    tags: ['oracle', 'defi', 'data'], calls: 43201, successRate: 99.7, revenue: 1296,
    ownerWallet: '0x1234567890ABCDEF', createdAt: '2024-03-05',
  },
  {
    _id: '5', name: 'SynthLang-3', category: 'NLP', description: 'Multi-modal language synthesis, translation and summarization with context window of 1M tokens.',
    endpoint: 'https://api.synthlang.ai', pricing: 0.04, status: 'active', rating: 4.5,
    tags: ['nlp', 'translation', 'text'], calls: 19005, successRate: 96.3, revenue: 760,
    ownerWallet: '0xFEDCBA9876543210', createdAt: '2024-02-20',
  },
  {
    _id: '6', name: 'ChainMind', category: 'Web3', description: 'Autonomous DeFi strategy agent — yield optimization, liquidity management, risk assessment.',
    endpoint: 'https://api.chainmind.finance', pricing: 0.15, status: 'busy', rating: 4.9,
    tags: ['defi', 'yield', 'web3'], calls: 8902, successRate: 98.1, revenue: 1335,
    ownerWallet: '0xA1B2C3D4E5F60718', createdAt: '2024-03-15',
  },
]