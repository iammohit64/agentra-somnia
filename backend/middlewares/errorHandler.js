import { Prisma } from '@prisma/client'
import config from '../config/config.js'

const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.url} —`, err.message)

  // Prisma unique constraint
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const field = err.meta?.target
      return res.status(409).json({
        error: 'Duplicate entry',
        field,
      })
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Record not found' })
    }
    if (err.code === 'P2003') {
      return res.status(400).json({ error: 'Invalid relation reference' })
    }
    return res.status(400).json({
      error: 'Database error',
      code: err.code,
    })
  }

  // Prisma validation
  if (err instanceof Prisma.PrismaClientValidationError) {
    return res.status(400).json({
      error: 'Invalid data provided',
      details: err.message.split('\n').slice(-2).join(' '),
    })
  }

  // Zod validation errors
  if (err.name === 'ZodError') {
    return res.status(400).json({
      error: 'Validation failed',
      issues: err.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
    })
  }

  // Custom app errors
  if (err.status) {
    return res.status(err.status).json({ error: err.message })
  }

  // Fallback
  res.status(500).json({
    error: config?.isDev ? err.message : 'Internal server error',
  })
}

// Async wrapper — catches async errors and passes to errorHandler
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next)

// Create HTTP error helper
const createError = (status, message) => {
  const err = new Error(message)
  err.status = status
  return err
}

export { errorHandler, asyncHandler, createError }