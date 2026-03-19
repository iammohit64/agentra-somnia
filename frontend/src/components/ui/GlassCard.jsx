import React from 'react'
import { motion } from 'framer-motion'
import clsx from 'clsx'

export default function GlassCard({
  children,
  className = '',
  glow = false,
  hover = true,
  onClick,
  ...props
}) {
  return (
    <motion.div
      whileHover={hover ? { y: -1, scale: 1.002 } : {}}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      onClick={onClick}
      className={clsx(
        'glass-panel rounded-xl transition-all duration-300',
        glow && 'glow-border',
        hover && 'hover:border-[var(--color-border-bright)]',
        onClick && 'cursor-pointer',
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  )
}