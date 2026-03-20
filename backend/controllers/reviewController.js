import prisma from '../lib/prisma.js'
import { asyncHandler } from '../middlewares/errorHandler.js'
import { z } from 'zod'

const createSchema = z.object({
  content: z.string().min(1).max(5000),
  rating: z.number().int().min(0).max(5).optional().default(0),
  parentId: z.string().optional(),
})

// ── GET /api/agents/:agentId/reviews ──────────────────────────
const getReviews = asyncHandler(async (req, res) => {
  const { agentId } = req.params
  const page = Math.max(1, parseInt(req.query.page) || 1)
  const limit = Math.min(parseInt(req.query.limit) || 20, 100)

  // Always look up by agentId (cuid) — never by ObjectId
  const agent = await prisma.agent.findFirst({
    where: { agentId },
    select: { agentId: true },
  })
  if (!agent) return res.status(404).json({ error: 'Agent not found' })

  // Fetch top-level reviews only
  const [topLevelReviews, total] = await prisma.$transaction([
    prisma.review.findMany({
      where: { agentId: agent.agentId, parentId: null },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        likes: { select: { walletAddress: true } },
      },
    }),
    prisma.review.count({ where: { agentId: agent.agentId, parentId: null } }),
  ])

  // Fetch first-level replies
  const reviewIds = topLevelReviews.map(r => r.id)
  const replies = reviewIds.length > 0
    ? await prisma.review.findMany({
        where: { parentId: { in: reviewIds } },
        orderBy: { createdAt: 'asc' },
        include: { likes: { select: { walletAddress: true } } },
      })
    : []

  // Fetch second-level replies
  const replyIds = replies.map(r => r.id)
  const deepReplies = replyIds.length > 0
    ? await prisma.review.findMany({
        where: { parentId: { in: replyIds } },
        orderBy: { createdAt: 'asc' },
        include: { likes: { select: { walletAddress: true } } },
      })
    : []

  // Format helper
  const fmt = (r) => ({
    id: r.id,
    agentId: r.agentId,
    authorWallet: r.authorWallet,
    content: r.content,
    rating: r.rating,
    parentId: r.parentId,
    likes: r.likes.map(l => l.walletAddress),
    createdAt: r.createdAt,
    replies: [],
  })

  // Build nested tree
  const replyMap = {}
  replies.forEach(r => {
    const formatted = fmt(r)
    formatted.replies = deepReplies
      .filter(d => d.parentId === r.id)
      .map(d => fmt(d))
    replyMap[r.id] = formatted
  })

  const structured = topLevelReviews.map(r => {
    const formatted = fmt(r)
    formatted.replies = replies
      .filter(rep => rep.parentId === r.id)
      .map(rep => replyMap[rep.id] || fmt(rep))
    return formatted
  })

  // Total likes across all fetched reviews
  const allIds = [
    ...reviewIds,
    ...replyIds,
    ...deepReplies.map(r => r.id),
  ]
  const totalLikes = allIds.length > 0
    ? await prisma.reviewLike.count({ where: { reviewId: { in: allIds } } })
    : 0

  res.json({
    reviews: structured,
    total,
    page,
    pages: Math.ceil(total / limit),
    totalLikes,
  })
})

// ── POST /api/agents/:agentId/reviews ─────────────────────────
const createReview = asyncHandler(async (req, res) => {
  const { agentId } = req.params
  const walletAddress = req.walletAddress
  const data = createSchema.parse(req.body)

  // Always look up by agentId (cuid)
  const agent = await prisma.agent.findFirst({
    where: { agentId },
    select: { agentId: true, ownerWallet: true, id: true, rating: true, ratingCount: true },
  })
  if (!agent) return res.status(404).json({ error: 'Agent not found' })

  // Validate parentId exists if provided
  if (data.parentId) {
    const parent = await prisma.review.findUnique({ where: { id: data.parentId } })
    if (!parent) return res.status(404).json({ error: 'Parent review not found' })
  }

  const review = await prisma.review.create({
    data: {
      agentId: agent.agentId,
      authorWallet: walletAddress,
      content: data.content,
      rating: data.rating,
      parentId: data.parentId || null,
    },
    include: { likes: { select: { walletAddress: true } } },
  })

  // Update agent rating if top-level review with a rating
  if (!data.parentId && data.rating > 0) {
    const newCount = agent.ratingCount + 1
    const newRating = ((agent.rating * agent.ratingCount) + data.rating) / newCount
    await prisma.agent.update({
      where: { id: agent.id },
      data: {
        rating: parseFloat(newRating.toFixed(2)),
        ratingCount: newCount,
      },
    })
  }

  res.status(201).json({
    ...review,
    likes: review.likes.map(l => l.walletAddress),
    replies: [],
  })
})

// ── POST /api/reviews/:reviewId/like ──────────────────────────
const likeReview = asyncHandler(async (req, res) => {
  const { reviewId } = req.params
  const walletAddress = req.walletAddress

  const review = await prisma.review.findUnique({ where: { id: reviewId } })
  if (!review) return res.status(404).json({ error: 'Review not found' })

  const existing = await prisma.reviewLike.findUnique({
    where: { reviewId_walletAddress: { reviewId, walletAddress } },
  })

  if (existing) {
    await prisma.reviewLike.delete({
      where: { reviewId_walletAddress: { reviewId, walletAddress } },
    })
    return res.json({ liked: false })
  }

  await prisma.reviewLike.create({ data: { reviewId, walletAddress } })
  res.json({ liked: true })
})

// ── DELETE /api/reviews/:reviewId ─────────────────────────────
const deleteReview = asyncHandler(async (req, res) => {
  const { reviewId } = req.params
  const walletAddress = req.walletAddress

  const review = await prisma.review.findUnique({ where: { id: reviewId } })
  if (!review) return res.status(404).json({ error: 'Review not found' })
  if (review.authorWallet !== walletAddress) {
    return res.status(403).json({ error: 'Not authorized' })
  }

  await deleteReviewTree(reviewId)
  res.json({ success: true })
})

async function deleteReviewTree(reviewId) {
  const children = await prisma.review.findMany({
    where: { parentId: reviewId },
    select: { id: true },
  })
  for (const child of children) {
    await deleteReviewTree(child.id)
  }
  await prisma.reviewLike.deleteMany({ where: { reviewId } })
  await prisma.review.delete({ where: { id: reviewId } })
}

export { getReviews, createReview, likeReview, deleteReview }