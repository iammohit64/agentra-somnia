import React from 'react'
import clsx from 'clsx'

const colorMap = {
  purple: 'text-[var(--color-purple-bright)] bg-[rgba(124,58,237,0.08)] border-[rgba(124,58,237,0.25)]',
  blue: 'text-[var(--color-star-blue)] bg-[rgba(147,197,253,0.07)] border-[rgba(147,197,253,0.2)]',
  green: 'text-[var(--color-success)] bg-[rgba(52,211,153,0.07)] border-[rgba(52,211,153,0.2)]',
  yellow: 'text-[var(--color-warning)] bg-[rgba(251,191,36,0.07)] border-[rgba(251,191,36,0.2)]',
  red: 'text-[var(--color-danger)] bg-[rgba(248,113,113,0.07)] border-[rgba(248,113,113,0.2)]',
}

export default function MetricBadge({ label, value, color = 'purple', icon: Icon, sublabel }) {
  return (
    <div className={clsx(
      'glass-panel rounded-xl p-4 border',
      colorMap[color]
    )}>
      <div className="flex items-center gap-2 mb-1.5">
        {Icon && <Icon size={13} />}
        <span className="text-[10px] font-mono uppercase tracking-[0.2em] opacity-60">{label}</span>
      </div>
      <div className="text-2xl font-display font-bold tracking-tight">{value}</div>
      {sublabel && <div className="text-xs opacity-50 mt-0.5 font-mono">{sublabel}</div>}
    </div>
  )
}