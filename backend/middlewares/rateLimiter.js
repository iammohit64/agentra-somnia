import rateLimit from 'express-rate-limit'
import config from '../config/config.js'

const createLimiter = (windowMs, max, message) =>
  rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) =>
      req.headers['x-wallet-address'] || req.ip,
  })

const apiLimiter = createLimiter(
  config.platform.rateLimitWindow,
  config.platform.rateLimitMax,
  'Too many requests. Slow down.'
)

const executionLimiter = createLimiter(
  config.platform.rateLimitWindow,
  config.platform.executionRateLimitMax,
  'Execution rate limit exceeded. Max 20 calls/minute.'
)

const deployLimiter = createLimiter(
  60 * 60 * 1000,
  config.platform.deployRateLimitMax,
  'Deploy rate limit exceeded. Max 10 deploys/hour.'
)

const authLimiter = createLimiter(
  15 * 60 * 1000,
  50,
  'Auth rate limit exceeded.'
)

export { apiLimiter, executionLimiter, deployLimiter, authLimiter }