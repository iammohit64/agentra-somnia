import { useEffect } from 'react'
import { useAgentStore } from '../stores/agentStore'
import { agentsAPI } from '../api/agents'

export function useAgents(params = {}) {
  const { setAgents, setLoading, setError, agents, isLoading, error } = useAgentStore()

  useEffect(() => {
    const fetchAgents = async () => {
      setLoading(true)
      try {
        const res = await agentsAPI.getAll(params)

        // Backend now returns consistent structure
        const agentsData = res?.data?.agents || []

        setAgents(agentsData)
      } catch (err) {
        setError(err?.response?.data?.error || err.message)

        // fallback mock (already converted to new schema shape)
        setAgents(MOCK_AGENTS)
      } finally {
        setLoading(false)
      }
    }

    fetchAgents()
  }, [JSON.stringify(params)])

  return { agents, isLoading, error }
}

// ✅ Updated mock data (aligned with new Prisma schema)
export const MOCK_AGENTS = [
  {
    id: '1',
    agentId: 'agent_1',
    name: 'DataSynth-7',
    description: 'Advanced data synthesis and pattern recognition agent.',
    metadataUri: '',
    endpoint: 'https://api.datasynth.ai',

    ownerWallet: '0xABCDEF1234567890',

    tier: 'Standard',
    pricing: '50000000000000000', // wei (0.05 AGT equivalent)
    upvotes: 12,

    category: 'Analysis',
    tags: ['data', 'analysis', 'ml'],
    status: 'active',

    rating: 4.8,
    ratingCount: 120,

    calls: 12847,
    successRate: 99.2,

    revenue: '642000000000000000000',

    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    agentId: 'agent_2',
    name: 'CodeForge-X',
    description: 'Autonomous code generation and optimization agent.',
    metadataUri: '',
    endpoint: 'https://api.codeforge.dev',

    ownerWallet: '0xDEF0123456789ABC',

    tier: 'Professional',
    pricing: '80000000000000000',
    upvotes: 30,

    category: 'Development',
    tags: ['code', 'dev', 'automation'],
    status: 'active',

    rating: 4.9,
    ratingCount: 200,

    calls: 28341,
    successRate: 97.8,

    revenue: '2267000000000000000000',

    createdAt: new Date().toISOString(),
  },
  {
    id: '3',
    agentId: 'agent_3',
    name: 'NeuralVault',
    description: 'Smart contract auditing and threat detection agent.',
    metadataUri: '',
    endpoint: 'https://api.neuralvault.io',

    ownerWallet: '0x9876543210ABCDEF',

    tier: 'Enterprise',
    pricing: '120000000000000000',
    upvotes: 18,

    category: 'Security',
    tags: ['security', 'audit', 'web3'],
    status: 'active',

    rating: 4.7,
    ratingCount: 95,

    calls: 5621,
    successRate: 98.5,

    revenue: '675000000000000000000',

    createdAt: new Date().toISOString(),
  },
]