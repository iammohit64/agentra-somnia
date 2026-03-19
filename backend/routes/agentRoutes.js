import { Router } from 'express'
import {
  getAgents,
  getAgentById,
  deployAgent,
  confirmDeploy,
  cancelDraft,
  updateAgent,
  deleteAgent,
  validateEndpoint,
  searchAgents,
  purchaseAccess,
  upvoteAgent,
  checkAccess
} from '../controllers/agentController.js'

import { authMiddleware, optionalAuth } from '../middlewares/auth.js'
import { deployLimiter } from '../middlewares/rateLimiter.js'

import { getAgentMetrics } from '../controllers/analyticsController.js'
import { getInteractions } from '../controllers/executionController.js'

const router = Router()

// ─────────────────────────────────────────────
// PUBLIC ROUTES
// ─────────────────────────────────────────────

router.get('/', optionalAuth, getAgents)
router.get('/search', searchAgents)
router.get('/:id', optionalAuth, getAgentById)
router.get('/:id/metrics', getAgentMetrics)
router.get('/:id/interactions', getInteractions)

// ─────────────────────────────────────────────
// WEB3 ACTIONS (PROTECTED)
// ─────────────────────────────────────────────

// Deploy agent (creates draft first)
router.post('/deploy', authMiddleware, deployLimiter, deployAgent)

// Confirm on-chain deployment
router.post('/:id/confirm', authMiddleware, confirmDeploy)

// Cancel draft
router.delete('/:id/draft', authMiddleware, cancelDraft)

// Purchase access (monthly / lifetime)
router.post('/:id/purchase', authMiddleware, purchaseAccess)

// Upvote agent (paid)
router.post('/:id/upvote', authMiddleware, upvoteAgent)

// Check access
router.get('/:id/access', authMiddleware, checkAccess)

// ─────────────────────────────────────────────
// OTHER PROTECTED ROUTES
// ─────────────────────────────────────────────

router.post('/validate-endpoint', authMiddleware, validateEndpoint)
router.put('/:id', authMiddleware, updateAgent)
router.delete('/:id', authMiddleware, deleteAgent)

export default router