/**
 * Sign in / Create account page. Username + WebAuthn passkey (no email).
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button } from '@/components/base/buttons/button'
import { useAuth } from '@/hooks/useAuth'
import { User01 } from '@untitledui/icons'

export function SignInPage() {
  const [username, setUsername] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { register, login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent, isRegister: boolean) => {
    e.preventDefault()
    setError(null)
    const u = username.trim().toLowerCase()
    if (!u || u.length < 2) {
      setError('Username must be at least 2 characters')
      return
    }
    setLoading(true)
    try {
      if (isRegister) {
        await register(u)
      } else {
        await login(u)
      }
      navigate('/', { replace: true })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-sm space-y-6 rounded-2xl border border-gray-200/60 bg-white/80 p-8 dark:border-gray-800/40 dark:bg-gray-900/80"
      >
        <div className="text-center">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            Sign in
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            No email. No password. Just your username and passkey.
          </p>
        </div>

        <form className="space-y-4" onSubmit={(e) => handleSubmit(e, false)}>
          <div>
            <label htmlFor="username" className="sr-only">
              Username
            </label>
            <div className="relative">
              <User01 className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value)
                  setError(null)
                }}
                placeholder="Username"
                autoComplete="username"
                disabled={loading}
                className="w-full rounded-xl border border-gray-200/60 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-gray-400 dark:border-gray-700/60 dark:bg-gray-900/50 dark:text-white dark:placeholder-gray-500 dark:focus:border-gray-600"
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
          )}

          <div className="flex gap-2">
            <Button
              type="submit"
              color="primary"
              size="md"
              className="flex-1 rounded-xl"
              disabled={loading}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
            <Button
              type="button"
              color="tertiary"
              size="md"
              className="flex-1 rounded-xl"
              disabled={loading}
              onClick={(e: React.MouseEvent) => handleSubmit(e as unknown as React.FormEvent, true)}
            >
              Create account
            </Button>
          </div>
        </form>

        <p className="text-center text-xs text-gray-400 dark:text-gray-500">
          Create account registers a passkey (Touch ID / Face ID / security key).
          Sign in uses an existing passkey. The passkey prompt appears after you
          click the button.
        </p>
      </motion.div>
    </div>
  )
}
