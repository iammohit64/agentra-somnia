import { Router } from 'express'
import {
  getAgents, getAgentById, deployAgent, confirmDeploy, cancelDraft, // <-- Added imports
  updateAgent, deleteAgent, validateEndpoint, searchAgents,
} from '../controllers/agentController.js'
import { authMiddleware, optionalAuth } from '../middlewares/auth.js'
import { deployLimiter } from '../middlewares/rateLimiter.js'
import { getAgentMetrics } from '../controllers/analyticsController.js'
import { getInteractions } from '../controllers/executionController.js'

const router = Router()

// Public
router.get('/', optionalAuth, getAgents)
router.get('/search', searchAgents)
router.get('/:id', optionalAuth, getAgentById)
router.get('/:id/metrics', getAgentMetrics)
router.get('/:id/interactions', getInteractions)

// Protected
router.post('/deploy', authMiddleware, deployLimiter, deployAgent)

// --- STATE MACHINE ROUTES ---
router.post('/:id/confirm', authMiddleware, confirmDeploy)
router.delete('/:id/draft', authMiddleware, cancelDraft)
// ----------------------------

router.post('/validate-endpoint', authMiddleware, validateEndpoint)
router.put('/:id', authMiddleware, updateAgent)
router.delete('/:id', authMiddleware, deleteAgent)

export default router