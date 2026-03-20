import { Router } from 'express'
import { getReviews, createReview, likeReview, deleteReview } from '../controllers/reviewController.js'
import { authMiddleware, optionalAuth } from '../middlewares/auth.js'

const router = Router({ mergeParams: true })

// Agent-scoped review routes
router.get('/agents/:agentId/reviews', optionalAuth, getReviews)
router.post('/agents/:agentId/reviews', authMiddleware, createReview)

// Review-level actions
router.post('/reviews/:reviewId/like', authMiddleware, likeReview)
router.delete('/reviews/:reviewId', authMiddleware, deleteReview)

export default router