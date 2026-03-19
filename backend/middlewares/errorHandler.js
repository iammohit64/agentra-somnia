import { Prisma } from '@prisma/client'
import config from '../config/config.js'

const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.url} —`, err.message)

  // Prisma known errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(409).json({
        error: 'Duplicate entry',
        field: err.meta?.target,
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

  // Prisma validation errors
  if (err instanceof Prisma.PrismaClientValidationError) {
    return res.status(400).json({
      error: 'Invalid data provided',
      details: err.message,
    })
  }

  // Zod validation
  if (err.name === 'ZodError') {
    return res.status(400).json({
      error: 'Validation failed',
      issues: err.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    })
  }

  // Blockchain / contract errors
  if (err.code === 'CALL_EXCEPTION' || err.code === 'INSUFFICIENT_FUNDS') {
    return res.status(400).json({
      error: 'Blockchain transaction failed',
      details: err.reason || err.message,
    })
  }

  // Custom app errors
  if (err.status) {
    return res.status(err.status).json({ error: err.message })
  }

  // Default fallback
  res.status(500).json({
    error: config.isDev ? err.message : 'Internal server error',
  })
}

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next)

const createError = (status, message) => {
  const err = new Error(message)
  err.status = status
  return err
}

export { errorHandler, asyncHandler, createError }