import React from 'react'

export default function LoadingPulse({ rows = 3 }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="glass-panel rounded-xl p-5 space-y-3">
          <div className="flex gap-3">
            <div className="shimmer-load w-10 h-10 rounded-lg" />
            <div className="flex-1 space-y-2">
              <div className="shimmer-load h-4 w-1/3 rounded" />
              <div className="shimmer-load h-3 w-1/4 rounded" />
            </div>
          </div>
          <div className="shimmer-load h-3 w-full rounded" />
          <div className="shimmer-load h-3 w-2/3 rounded" />
        </div>
      ))}
    </div>
  )
}