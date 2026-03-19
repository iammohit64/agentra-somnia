import React from 'react'

export default function NeuralGrid() {
  return (
    <div
      className="fixed inset-0 pointer-events-none z-0 opacity-20"
      style={{
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)
        `,
        backgroundSize: '80px 80px',
      }}
    />
  )
}