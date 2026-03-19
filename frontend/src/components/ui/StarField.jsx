import React, { useEffect, useRef, useMemo } from 'react'

/* Generate deterministic CSS star positions at module level */
function generateCSSStars(count) {
  const stars = []
  for (let i = 0; i < count; i++) {
    const x = (Math.sin(i * 127.1 + 311.7) * 43758.5453) % 1
    const y = (Math.sin(i * 269.5 + 183.3) * 43758.5453) % 1
    const size = 0.4 + Math.abs((Math.sin(i * 67.3) * 43758.5453) % 1) * 1.2
    const rand = Math.abs((Math.sin(i * 43.1) * 43758.5453) % 1)
    const speed = rand < 0.3 ? 'fast' : rand < 0.6 ? 'medium' : 'slow'
    const colorRand = Math.abs((Math.sin(i * 91.7) * 43758.5453) % 1)
    const color = colorRand > 0.93 ? 'purple' : colorRand > 0.8 ? 'blue' : ''
    const delay = Math.abs((Math.sin(i * 17.9) * 43758.5453) % 1) * 8

    stars.push({
      left: `${Math.abs(x) * 100}%`,
      top: `${Math.abs(y) * 100}%`,
      width: size,
      height: size,
      speed,
      color,
      delay,
    })
  }
  return stars
}

export default function StarField() {
  const canvasRef = useRef(null)
  const cssStars = useMemo(() => generateCSSStars(120), [])

  /* Lightweight canvas layer for ambient depth particles */
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    let animId
    let stars = []
    const STAR_COUNT = 150

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      initStars()
    }

    const initStars = () => {
      stars = Array.from({ length: STAR_COUNT }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 0.9 + 0.1,
        baseAlpha: Math.random() * 0.5 + 0.05,
        alpha: 0,
        twinkleSpeed: Math.random() * 0.005 + 0.001,
        twinkleOffset: Math.random() * Math.PI * 2,
        color: Math.random() > 0.93
          ? `rgba(168,85,247,`
          : Math.random() > 0.8
          ? `rgba(147,197,253,`
          : `rgba(248,248,255,`,
      }))
    }

    let t = 0
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      t += 0.016

      stars.forEach(s => {
        s.alpha = s.baseAlpha * (0.3 + 0.7 * Math.sin(t * s.twinkleSpeed * 60 + s.twinkleOffset))
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `${s.color}${Math.max(0, s.alpha)})`
        ctx.fill()
      })

      animId = requestAnimationFrame(draw)
    }

    resize()
    draw()
    window.addEventListener('resize', resize)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <>
      {/* CSS-based twinkling stars — GPU-accelerated, no JS per-frame cost */}
      <div className="css-stars" aria-hidden="true">
        {cssStars.map((star, i) => (
          <div
            key={i}
            className={`star star--${star.speed}${star.color ? ` star--${star.color}` : ''}`}
            style={{
              left: star.left,
              top: star.top,
              width: star.width,
              height: star.height,
              animationDelay: `${star.delay}s`,
            }}
          />
        ))}
      </div>

      {/* Canvas layer for subtle ambient particles */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-0"
        style={{ mixBlendMode: 'screen', opacity: 0.7 }}
        aria-hidden="true"
      />
    </>
  )
}