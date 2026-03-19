import dotenv from 'dotenv'

dotenv.config()

const config = {
  port: parseInt(process.env.PORT) || 5001,
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: process.env.NODE_ENV !== 'production',

  database: {
    url: process.env.DATABASE_URL,
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-CHANGE-ME',
    expiresIn: '7d',
  },

  blockchain: {
    rpcUrl: process.env.BLOCKCHAIN_RPC_URL || '',
    privateKey: process.env.PRIVATE_KEY || '',
    contracts: {
      agentRegistry: process.env.AGENT_REGISTRY_ADDRESS || '',
      payment: process.env.PAYMENT_CONTRACT_ADDRESS || '',
      voting: process.env.VOTING_CONTRACT_ADDRESS || '',
    },
  },

  ipfs: {
    projectId: process.env.IPFS_PROJECT_ID || '',
    projectSecret: process.env.IPFS_PROJECT_SECRET || '',
    gateway: process.env.IPFS_GATEWAY || '',
  },

  platform: {
    feePercent: parseFloat(process.env.PLATFORM_FEE_PERCENT) || 5,
    maxCallDepth: parseInt(process.env.MAX_CALL_DEPTH) || 5,
    callTimeoutMs: parseInt(process.env.CALL_TIMEOUT_MS) || 30000,
    rateLimitWindow: 60 * 1000,
    rateLimitMax: 100,
    executionRateLimitMax: 20,
    deployRateLimitMax: 10,
    leaderboardCronSchedule: '*/5 * * * *',
    healthCheckCronSchedule: '*/2 * * * *',
  },
}

export default config