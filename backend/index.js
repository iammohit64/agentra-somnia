import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'

import config from './config/config.js'
import { errorHandler } from './middlewares/errorHandler.js'
import { apiLimiter } from './middlewares/rateLimiter.js'
import prisma from './lib/prisma.js'

// Routes
import agentRoutes from './routes/agentRoutes.js'
import authRoutes from './routes/authRoutes.js'
import executionRoutes from './routes/executionRoutes.js'
import analyticsRoutes from './routes/analyticsRoutes.js'

const app = express()

// ── Core middleware ────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
)

app.use(
  cors({
    origin: config.isDev
      ? ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5174']
      : process.env.ALLOWED_ORIGINS?.split(',') || [],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-wallet-address'],
  })
)

app.use(express.json({ limit: '2mb' }))
app.use(express.urlencoded({ extended: true, limit: '2mb' }))
app.use(morgan(config.isDev ? 'dev' : 'combined'))
app.use(apiLimiter)

// ── Health check ───────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'neural-market-api',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    env: config.nodeEnv,
  })
})

// ── API routes ─────────────────────────────────────────────
app.use('/api/auth', authRoutes)
app.use('/api/agents', agentRoutes)
app.use('/api', executionRoutes)
app.use('/api', analyticsRoutes)

// ── 404 handler ────────────────────────────────────────────
app.use('*', (req, res) => {
  res.status(404).json({
    error: `Route ${req.method} ${req.originalUrl} not found`,
  })
})

// ── Error handler ──────────────────────────────────────────
app.use(errorHandler)

// ── Start server ───────────────────────────────────────────
const start = async () => {
  try {
    // Note: Blockchain listeners removed. 
    // State is now managed via frontend Draft -> Confirm flow.

    app.listen(config.port, () => {
      console.log(`\n🚀 Neural Market API running on port ${config.port}`)
      console.log(`   Environment  : ${config.nodeEnv}`)
      console.log(`   Database     : Prisma / MongoDB`)
      console.log(`   Health       : http://localhost:${config.port}/health\n`)
    })
  } catch (err) {
    console.error('❌ Startup error:', err)
    process.exit(1)
  }
}

start()

export default app