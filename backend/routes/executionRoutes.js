import { Router } from 'express'
import { executeAgent, composeAgents, voteOnAgent } from '../controllers/executionController.js'
import { authMiddleware } from '../middlewares/auth.js'
import { executionLimiter } from '../middlewares/rateLimiter.js'

const router = Router()

router.post('/agents/:id/execute', authMiddleware, executionLimiter, executeAgent)
router.post('/agents/:id/vote', authMiddleware, voteOnAgent)
router.post('/agents/compose', authMiddleware, executionLimiter, composeAgents)

export default router