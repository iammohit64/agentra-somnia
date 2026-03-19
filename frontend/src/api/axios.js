import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:5001/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const wallet = localStorage.getItem('wallet-address')
  if (wallet) config.headers['x-wallet-address'] = wallet
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    console.error('API Error:', err.response?.data || err.message)
    return Promise.reject(err)
  }
)

export default api