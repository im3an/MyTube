import { twMerge, twJoin } from 'tailwind-merge'

export function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(twJoin(inputs))
}

export function formatRelativeTime(timestampMs: number): string {
  const diffMs = Date.now() - timestampMs
  const diffSecs = Math.floor(diffMs / 1000)
  if (diffSecs < 60) return 'just now'
  const diffMins = Math.floor(diffSecs / 60)
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
  return new Date(timestampMs).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: new Date(timestampMs).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  })
}
