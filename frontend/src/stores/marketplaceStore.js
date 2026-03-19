import { create } from 'zustand'

export const useMarketplaceStore = create((set) => ({
  filters: {
    category: 'all',
    sortBy: 'rating',
    priceRange: [0, 100],
    status: 'all',
  },
  search: '',

  setFilter: (key, value) => set((state) => ({
    filters: { ...state.filters, [key]: value }
  })),

  setSearch: (search) => set({ search }),

  resetFilters: () => set({
    filters: { category: 'all', sortBy: 'rating', priceRange: [0, 100], status: 'all' },
    search: '',
  }),
}))