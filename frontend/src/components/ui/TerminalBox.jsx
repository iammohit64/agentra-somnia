import React, { useEffect, useRef } from 'react'
import { Terminal } from 'lucide-react'

export default function TerminalBox({ logs = [], title = 'SYSTEM LOG', className = '' }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const levelColor = {
    info: 'text-[var(--color-star-blue)]',
    success: 'text-[var(--color-success)]',
    error: 'text-[var(--color-danger)]',
    warn: 'text-[var(--color-warning)]',
    system: 'text-[var(--color-purple-bright)]',
  }

  return (
    <div className={`glass-panel rounded-xl overflow-hidden ${className}`}>
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[var(--color-border)] bg-[var(--color-panel-light)]">
        <Terminal size={13} className="text-[var(--color-purple-bright)]" />
        <span className="font-mono text-[10px] text-[var(--color-text-muted)] tracking-[0.2em] uppercase">{title}</span>
        <div className="ml-auto flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-danger)] opacity-50" />
          <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-warning)] opacity-50" />
          <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-success)] opacity-50" />
        </div>
      </div>
      <div className="p-4 h-64 overflow-y-auto font-mono text-xs space-y-1.5 bg-black/40">
        {logs.length === 0 ? (
          <div className="text-[var(--color-text-dim)] terminal-cursor">Awaiting input...</div>
        ) : (
          logs.map((log, i) => (
            <div key={log.id || i} className="flex gap-3 leading-relaxed">
              <span className="text-[var(--color-text-dim)] shrink-0">
                {new Date(log.timestamp).toLocaleTimeString('en', { hour12: false })}
              </span>
              <span className={`${levelColor[log.level] || 'text-[var(--color-text-secondary)]'} shrink-0 uppercase text-[10px] font-bold pt-0.5`}>
                [{log.level || 'INFO'}]
              </span>
              <span className="text-[var(--color-text-secondary)] break-all">{log.message}</span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}