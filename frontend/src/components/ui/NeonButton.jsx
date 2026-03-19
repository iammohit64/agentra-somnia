import React from 'react'
import { motion } from 'framer-motion'
import clsx from 'clsx'

export default function NeonButton({
  children,
  variant = 'primary',
  size = 'md',
  onClick,
  disabled = false,
  loading = false,
  className = '',
  icon: Icon,
  type = 'button',
  ...props
}) {
  const variants = {
    primary: 'btn-primary',
    ghost: 'btn-ghost',
    danger: 'bg-transparent border border-[var(--color-danger)] text-[var(--color-danger)] font-mono text-xs tracking-widest hover:bg-[var(--color-danger)] hover:text-white transition-all duration-200',
    success: 'bg-transparent border border-[var(--color-success)] text-[var(--color-success)] font-mono text-xs tracking-widest hover:bg-[var(--color-success)] hover:text-black transition-all duration-200',
    solid: 'btn-primary',
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-8 py-3.5 text-base',
  }

  return (
    <motion.button
      type={type}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      onClick={onClick}
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center gap-2 rounded-lg font-mono tracking-widest',
        'transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed',
        variants[variant] || variants.primary,
        sizes[size],
        className
      )}
      {...props}
    >
      {loading ? (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : Icon ? (
        <Icon size={size === 'sm' ? 13 : 15} />
      ) : null}
      {children}
    </motion.button>
  )
}