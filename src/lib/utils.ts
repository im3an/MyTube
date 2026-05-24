import { twMerge, twJoin } from 'tailwind-merge'

export function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(twJoin(inputs))
}

/** Format a Unix-seconds timestamp as a short relative string: "3m ago", "2h ago", "4d ago". */
export function formatRelativeTime(publishedAt: number): string {
  const diffMs = Date.now() - publishedAt * 1000
  const diffMins = Math.floor(diffMs / 60_000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays > 0) return `${diffDays}d ago`
  if (diffHours > 0) return `${diffHours}h ago`
  if (diffMins > 0) return `${diffMins}m ago`
  return 'Just now'
}
