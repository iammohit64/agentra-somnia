import { Router } from 'express'
import { getDashboard, getGlobalStats } from '../controllers/analyticsController.js'
import {
  getLeaderboard,
  getTopAgents,
  getLeaderboardByCategory,
  recalculateScores,
  getAgentRank,
  getLeaderboardStats,
} from '../controllers/leaderboardController.js'
import { authMiddleware, optionalAuth } from '../middlewares/auth.js'

const router = Router()

// ── Leaderboard ────────────────────────────────────────────
router.get('/leaderboard', getLeaderboard)
router.get('/leaderboard/stats', getLeaderboardStats)
router.get('/leaderboard/top/:n', getTopAgents)
router.get('/leaderboard/category/:category', getLeaderboardByCategory)
router.get('/leaderboard/agent/:id/rank', getAgentRank)
router.post('/leaderboard/recalculate', recalculateScores)

// ── Analytics ──────────────────────────────────────────────
router.get('/analytics/global', getGlobalStats)
router.get('/analytics/dashboard', authMiddleware, getDashboard)

export default router