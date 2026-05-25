/**
 * Top-level React Error Boundary.
 * Catches render errors anywhere in the tree and shows a recovery UI
 * instead of a blank white page.
 */

import { Component, type ReactNode, type ErrorInfo } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  errorMessage: string
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, errorMessage: '' }
  }

  static getDerivedStateFromError(err: Error): State {
    return { hasError: true, errorMessage: err?.message ?? 'Unknown error' }
  }

  componentDidCatch(err: Error, info: ErrorInfo) {
    // In production you'd send this to a logging service (Sentry, etc.)
    console.error('[ErrorBoundary]', err, info.componentStack)
  }

  handleReload = () => {
    window.location.reload()
  }

  handleBack = () => {
    this.setState({ hasError: false, errorMessage: '' })
    window.history.back()
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-white px-6 text-center dark:bg-gray-950">
        {/* Icon */}
        <div className="flex size-16 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-950/30">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="size-8 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
        </div>

        {/* Text */}
        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            Something went wrong
          </h1>
          <p className="max-w-sm text-sm text-gray-500 dark:text-gray-400">
            An unexpected error occurred. You can try going back or reloading the page.
          </p>
          {import.meta.env.DEV && this.state.errorMessage && (
            <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 font-mono text-xs text-red-600 dark:bg-red-950/40 dark:text-red-400">
              {this.state.errorMessage}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={this.handleBack}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Go back
          </button>
          <button
            onClick={this.handleReload}
            className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
          >
            Reload page
          </button>
        </div>
      </div>
    )
  }
}
