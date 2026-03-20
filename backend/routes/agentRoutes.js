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
  checkUpvote,
  checkAccess,
} from '../controllers/agentController.js'

import { authMiddleware, optionalAuth } from '../middlewares/auth.js'
import { deployLimiter } from '../middlewares/rateLimiter.js'

import { getAgentMetrics } from '../controllers/analyticsController.js'
import { getReviews, createReview } from '../controllers/reviewController.js'

const router = Router()

// ─────────────────────────────────────────────
// PUBLIC ROUTES
// ─────────────────────────────────────────────

router.get('/', optionalAuth, getAgents)
router.get('/search', searchAgents)
router.get('/:agentId/metrics', getAgentMetrics)

// ─────────────────────────────────────────────
// WEB3 ACTIONS (PROTECTED)
// ─────────────────────────────────────────────

// Deploy agent (creates draft first)
router.post('/deploy', authMiddleware, deployLimiter, deployAgent)

// Other protected routes before /:id to avoid conflicts
router.post('/validate-endpoint', authMiddleware, validateEndpoint)

// Routes with :id param
router.get('/:id', optionalAuth, getAgentById)

// Confirm on-chain deployment
router.post('/:id/confirm', authMiddleware, confirmDeploy)

// Cancel draft
router.delete('/:id/draft', authMiddleware, cancelDraft)

// Purchase access (monthly / lifetime)
router.post('/:agentId/purchase', authMiddleware, purchaseAccess)

// Upvote agent
router.post('/:agentId/upvote', authMiddleware, upvoteAgent)

// Check if user has upvoted
router.get('/:agentId/upvote-status', authMiddleware, checkUpvote)

// Check access
router.get('/:agentId/access', authMiddleware, checkAccess)

// Reviews
router.get('/:agentId/reviews', optionalAuth, getReviews)
router.post('/:agentId/reviews', authMiddleware, createReview)

// Update / Delete
router.put('/:id', authMiddleware, updateAgent)
router.delete('/:id', authMiddleware, deleteAgent)

export default router