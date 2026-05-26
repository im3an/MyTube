import { cn } from '@/lib/utils'

interface VideoCardSkeletonProps {
  className?: string
}

export function VideoCardSkeleton({ className }: VideoCardSkeletonProps) {
  return (
    <div className={cn('animate-pulse', className)}>
      <div className="aspect-video overflow-hidden rounded-2xl bg-gray-100 dark:bg-gray-700/60" />
      <div className="mt-3.5 flex items-start gap-3">
        <div className="size-8 shrink-0 rounded-full bg-gray-100 dark:bg-gray-700/60" />
        <div className="flex-1 space-y-2 pt-0.5">
          <div className="h-[15px] w-[70%] rounded-md bg-gray-100 dark:bg-gray-700/60" />
          <div className="h-[13px] w-[50%] rounded-md bg-gray-100 dark:bg-gray-700/60" />
          <div className="h-[11px] w-[35%] rounded-md bg-gray-100 dark:bg-gray-700/60" />
        </div>
      </div>
    </div>
  )
}
