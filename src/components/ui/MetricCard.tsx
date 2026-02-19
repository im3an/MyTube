import type { ComponentType, ReactNode } from 'react'
import { cx } from '@/utils/cx'

export interface MetricCardProps {
  label: string
  value: string | number
  change?: string | number
  trend?: 'up' | 'down'
  icon?: ComponentType<{ className?: string }>
  action?: ReactNode
  className?: string
}

export function MetricCard({
  label,
  value,
  change,
  trend,
  icon: Icon,
  action,
  className,
}: MetricCardProps) {
  return (
    <div
      className={cx(
        'group relative overflow-hidden rounded-2xl border border-gray-100/80 bg-white p-5 transition-all duration-300 hover:border-gray-200/80 hover:shadow-sm dark:border-gray-800/50 dark:bg-white/[0.02] dark:hover:border-gray-700/60 dark:hover:bg-white/[0.04]',
        className
      )}
    >
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
            {label}
          </p>
          <div className="mt-2.5 flex items-baseline gap-2">
            <p className="text-2xl font-semibold tabular-nums tracking-tight text-gray-900 dark:text-white">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
            {change != null && (
              <span
                className={cx(
                  'inline-flex items-center rounded-full px-1.5 py-0.5 text-[11px] font-medium',
                  trend === 'up' && 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
                  trend === 'down' && 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
                )}
              >
                {typeof change === 'number' ? `${change > 0 ? '+' : ''}${change}%` : change}
              </span>
            )}
          </div>
          {action && <div className="mt-3">{action}</div>}
        </div>
        {Icon && (
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-gray-400 transition-all duration-200 group-hover:bg-gray-100 group-hover:text-gray-500 dark:bg-white/[0.04] dark:text-gray-500 dark:group-hover:bg-white/[0.06] dark:group-hover:text-gray-400">
            <Icon className="size-4" />
          </span>
        )}
      </div>
    </div>
  )
}
