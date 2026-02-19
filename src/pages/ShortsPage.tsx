import { PageHeader } from '@/components/ui/PageHeader'
import { Zap } from '@untitledui/icons'

export function ShortsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Shorts"
        description="Short-form video content"
      />
      <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in">
        <div className="flex size-20 items-center justify-center rounded-2xl bg-gray-50 dark:bg-gray-800">
          <Zap className="size-10 text-gray-300 dark:text-gray-600" />
        </div>
        <h2 className="mt-5 text-lg font-semibold text-gray-900 dark:text-white">
          Coming soon
        </h2>
        <p className="mt-2 max-w-xs text-sm text-gray-400 dark:text-gray-500">
          Short-form vertical videos will appear here. Stay tuned.
        </p>
      </div>
    </div>
  )
}
