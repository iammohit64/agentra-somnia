import cron from 'node-cron'
import analyticsService from '../services/analyticsService.js'
import config from '../config/config.js'

let isRunning = false

const runLeaderboardUpdate = async () => {
  if (isRunning) {
    console.log('[LEADERBOARD JOB] Already running, skipping...')
    return
  }

  isRunning = true
  try {
    const count = await analyticsService.updateLeaderboardScores()
    console.log(`[LEADERBOARD JOB] ✅ Updated ${count} agent scores`)
  } catch (err) {
    console.error('[LEADERBOARD JOB] ❌ Error:', err.message)
  } finally {
    isRunning = false
  }
}

const startLeaderboardJob = () => {
  const schedule = config.platform.leaderboardCronSchedule || '*/5 * * * *'
  console.log(`[LEADERBOARD JOB] Starting — schedule: ${schedule}`)

  cron.schedule(schedule, runLeaderboardUpdate)

  // Run immediately on startup
  setTimeout(runLeaderboardUpdate, 3000)
}

export { startLeaderboardJob }