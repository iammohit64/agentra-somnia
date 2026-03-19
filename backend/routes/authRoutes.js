import { Router } from 'express'
import { getNonce, verifyWallet, getProfile } from '../controllers/authController.js'
import { authMiddleware } from '../middlewares/auth.js'
import { authLimiter } from '../middlewares/rateLimiter.js'

const router = Router()

router.get('/nonce/:address', authLimiter, getNonce)
router.post('/verify-wallet', authLimiter, verifyWallet)
router.get('/profile', authMiddleware, getProfile)

export default router