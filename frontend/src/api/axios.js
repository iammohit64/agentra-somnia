import axios from 'axios'

const API_BASE =
  import.meta.env.VITE_API_URL || 'http://localhost:5001/api'

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ─────────────────────────────────────────────
// REQUEST INTERCEPTOR (WALLET + AUTH)
// ─────────────────────────────────────────────
api.interceptors.request.use((config) => {
  const wallet = localStorage.getItem('wallet-address')
  const token = localStorage.getItem('auth-token')

  if (wallet) {
    config.headers['x-wallet-address'] = wallet
  }

  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`
  }

  return config
})

// ─────────────────────────────────────────────
// RESPONSE INTERCEPTOR (ERROR HANDLING)
// ─────────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message

    console.error('API Error:', message)

    // Optional: auto logout on 401
    if (error.response?.status === 401) {
      localStorage.removeItem('auth-token')
    }

    return Promise.reject(error)
  }
)

export default api