import cron from 'node-cron'
import axios from 'axios'
import prisma from '../lib/prisma.js'
import config from '../config/config.js'

const checkAgentHealth = async () => {
  const agents = await prisma.agent.findMany({
    where: { status: { in: ['active', 'busy', 'offline'] } },
    select: {
      id: true,
      name: true,
      endpoint: true,
      status: true,
      contractAgentId: true,
    },
  })

  let checked = 0
  let recovered = 0
  let failed = 0

  for (const agent of agents) {
    try {
      const res = await axios.get(`${agent.endpoint}/health`, {
        timeout: 5000,
        validateStatus: (s) => s < 500,
      })

      const isHealthy = res.status < 400

      if (isHealthy && agent.status === 'offline') {
        await prisma.agent.update({
          where: { id: agent.id },
          data: { status: 'active' },
        })
        recovered++
        console.log(`[HEALTH] ✅ Agent recovered: ${agent.name}`)
      } else if (!isHealthy && agent.status === 'active') {
        await prisma.agent.update({
          where: { id: agent.id },
          data: { status: 'offline' },
        })
        failed++
        console.warn(`[HEALTH] ⚠️ Agent went offline: ${agent.name}`)
      }
    } catch {
      if (agent.status === 'active') {
        await prisma.agent.update({
          where: { id: agent.id },
          data: { status: 'offline' },
        })
        failed++
        console.warn(`[HEALTH] ❌ Agent unreachable: ${agent.name}`)
      }
    }

    checked++
  }

  if (checked > 0) {
    console.log(`[HEALTH] Checked ${checked} agents — ${recovered} recovered, ${failed} offline`)
  }
}

const startHealthCheckJob = () => {
  const schedule = config.platform.healthCheckCronSchedule || '*/2 * * * *'
  console.log(`[HEALTH JOB] Starting — schedule: ${schedule}`)
  cron.schedule(schedule, checkAgentHealth)
}

export { startHealthCheckJob }