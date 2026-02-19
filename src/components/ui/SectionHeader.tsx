import type { ReactNode } from 'react'
import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { cx } from '@/utils/cx'

function AnimatedVideoCount({ count, hasMore }: { count: number; hasMore?: boolean }) {
  const target = Math.min(count, 99)
  const [display, setDisplay] = useState(0)
  const displayRef = useRef(0)
  const rafRef = useRef<number>()

  useEffect(() => {
    const start = displayRef.current
    const diff = target - start
    const duration = 600
    const startTime = performance.now()

    const tick = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 2.5)
      const next = Math.round(start + diff * eased)
      displayRef.current = next
      setDisplay(next)
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick)
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [target])

  const suffix = hasMore ? '+' : ''

  return (
    <motion.p
      className="mt-0.5 flex items-baseline gap-0.5 text-sm text-gray-500 dark:text-gray-400"
      initial={{ opacity: 0, y: 2 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <span className="tabular-nums">{display}</span>
      {suffix && <span>{suffix}</span>}
      <span> videos</span>
    </motion.p>
  )
}

export interface SectionHeaderProps {
  title: string
  description?: string
  /** When provided, shows animated count instead of description. Caps at 99+. */
  videoCount?: number
  hasMore?: boolean
  actions?: ReactNode
  tabs?: ReactNode
  className?: string
  /** When true, renders with a subtle bottom border */
  divider?: boolean
}

export function SectionHeader({
  title,
  description,
  videoCount,
  hasMore,
  actions,
  tabs,
  className,
  divider = true,
}: SectionHeaderProps) {
  const showAnimatedCount = videoCount != null

  return (
    <div className={cx('space-y-3', className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">
            {title}
          </h2>
          {showAnimatedCount ? (
            <AnimatedVideoCount count={videoCount} hasMore={hasMore} />
          ) : description ? (
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              {description}
            </p>
          ) : null}
        </div>
        {actions && (
          <div className="flex shrink-0 items-center gap-2">
            {actions}
          </div>
        )}
      </div>
      {tabs && <div className="pt-1">{tabs}</div>}
      {divider && (
        <div className="border-t border-gray-100 dark:border-gray-800" />
      )}
    </div>
  )
}
