import { create } from 'zustand'

export const useAgentStore = create((set, get) => ({
  agents: [],
  selectedAgent: null,
  isLoading: false,
  error: null,

  setAgents: (agents) => set({ agents }),
  setSelectedAgent: (agent) => set({ selectedAgent: agent }),
  setLoading: (v) => set({ isLoading: v }),
  setError: (err) => set({ error: err }),

  updateAgentInList: (agentId, updates) => set((state) => ({
    agents: state.agents.map(a => a._id === agentId ? { ...a, ...updates } : a)
  })),

  clearSelected: () => set({ selectedAgent: null }),
}))