import { Router } from 'express'
import {
  executeAgent,
  composeAgents,
  upvoteAgent
} from '../controllers/executionController.js'
import { authMiddleware } from '../middlewares/auth.js'
import { executionLimiter } from '../middlewares/rateLimiter.js'

const router = Router()

// Requires access (monthly/lifetime) but no crypto payment
router.post('/agents/:id/execute', authMiddleware, executionLimiter, executeAgent)

// Paid upvote (ERC20)
router.post('/agents/:id/upvote', authMiddleware, upvoteAgent)

// Agent-to-agent composition (no crypto payment)
router.post('/agents/compose', authMiddleware, executionLimiter, composeAgents)

export default router