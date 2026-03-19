import rateLimit from 'express-rate-limit'
import config from '../config/config.js'

const getKey = (req) => {
  return (
    req.user?.walletAddress ||
    req.headers['x-wallet-address'] ||
    req.ip
  )
}

const createLimiter = (windowMs, max, message) =>
  rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: getKey,
  })

const apiLimiter = createLimiter(
  config.platform.rateLimitWindow,
  config.platform.rateLimitMax,
  'Too many requests. Slow down.'
)

const executionLimiter = createLimiter(
  config.platform.rateLimitWindow,
  config.platform.executionRateLimitMax,
  'Execution rate limit exceeded.'
)

const deployLimiter = createLimiter(
  60 * 60 * 1000,
  config.platform.deployRateLimitMax,
  'Deploy rate limit exceeded.'
)

const authLimiter = createLimiter(
  15 * 60 * 1000,
  50,
  'Auth rate limit exceeded.'
)

export { apiLimiter, executionLimiter, deployLimiter, authLimiter }