import { useEffect, useState } from 'react'

/**
 * Full-screen loading indicator shown while a lazy page chunk is being fetched.
 * Fades in after a short delay so fast loads don't flash the spinner at all.
 */
export function PageLoader() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 100)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div
      className={`flex min-h-[60vh] items-center justify-center transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      aria-label="Loading page"
      role="status"
    >
      <div className="flex flex-col items-center gap-4">
        {/* Spinner ring */}
        <div className="relative h-10 w-10">
          <div className="absolute inset-0 rounded-full border-2 border-gray-200 dark:border-gray-700" />
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-red-500" />
        </div>
        <p className="text-sm text-gray-400 dark:text-gray-500">Loading…</p>
      </div>
    </div>
  )
}
