import { Button } from '@/components/base/buttons/button'

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in">
      <span className="text-7xl font-bold tracking-tighter text-gray-100 dark:text-gray-800">
        404
      </span>
      <h1 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">
        Page not found
      </h1>
      <p className="mt-2 max-w-xs text-sm text-gray-400 dark:text-gray-500">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Button href="/" color="primary" size="md" className="mt-6 rounded-xl">
        Go home
      </Button>
    </div>
  )
}
