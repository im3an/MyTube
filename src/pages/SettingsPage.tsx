import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/base/buttons/button'
import { useUserData } from '@/hooks/useUserData'
import { useAuth } from '@/hooks/useAuth'
import { AvatarSelector } from '@/components/settings/AvatarSelector'
import { User01 } from '@untitledui/icons'

export function SettingsPage() {
  const { user, updateProfile, logout } = useAuth()
  const { username, setUsername } = useUserData()
  const [input, setInput] = useState((username || user?.displayName) ?? '')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setInput(user?.displayName ?? username ?? '')
  }, [username, user?.displayName])

  const handleSave = async () => {
    if (user) {
      await updateProfile({ displayName: input.trim() })
    } else {
      setUsername(input)
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleAvatarSelect = async (avatarUrl: string | null) => {
    if (user) {
      await updateProfile({ avatarUrl: avatarUrl ?? undefined })
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <PageHeader
        title="Settings"
        description="Manage your account preferences"
      />

      <div className="space-y-6">
        {user && (
          <div className="rounded-2xl border border-gray-200/60 bg-white/50 p-6 dark:border-gray-800/40 dark:bg-white/[0.02]">
            <h3 className="text-center text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Profile picture
            </h3>
            <p className="mt-1 text-center text-sm text-gray-500 dark:text-gray-400">
              Choose a preset or upload your own.
            </p>
            <div className="mt-4 flex justify-center">
              <AvatarSelector
                currentAvatarUrl={user.avatarUrl}
                onSelect={handleAvatarSelect}
              />
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-gray-200/60 bg-white/50 p-6 dark:border-gray-800/40 dark:bg-white/[0.02]">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {user ? 'Display name' : 'Username'}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {user ? 'Your display name is synced to your account.' : 'Choose a display name. Stored locally.'}
          </p>
          <div className="mt-4 flex gap-3">
            <div className="relative flex-1">
              <User01 className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Enter your name"
                maxLength={32}
                className="w-full rounded-xl border border-gray-200/60 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-gray-400 dark:border-gray-700/60 dark:bg-gray-900/50 dark:text-white dark:placeholder-gray-500 dark:focus:border-gray-600"
              />
            </div>
            <Button
              onClick={handleSave}
              color="primary"
              size="md"
              className="rounded-xl shrink-0"
            >
              {saved ? 'Saved' : 'Save'}
            </Button>
          </div>
        </div>

        {user && (
          <div className="rounded-2xl border border-gray-200/60 bg-white/50 p-6 dark:border-gray-800/40 dark:bg-white/[0.02]">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Account
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Sign out of your account on this device.
            </p>
            <Button
              onClick={() => logout()}
              color="tertiary"
              size="md"
              className="mt-4 rounded-xl"
            >
              Sign out
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
