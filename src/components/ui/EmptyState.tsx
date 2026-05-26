import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-24 text-center animate-fade-in',
        className
      )}
    >
      {icon && (
        <div className="flex size-20 items-center justify-center rounded-2xl bg-gray-50 dark:bg-gray-800">
          {icon}
        </div>
      )}
      <h2
        className={cn(
          'text-lg font-semibold text-gray-900 dark:text-white',
          icon ? 'mt-5' : 'mt-0'
        )}
      >
        {title}
      </h2>
      {description && (
        <p className="mt-2 max-w-xs text-sm text-gray-400 dark:text-gray-500">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-6 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-700 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
