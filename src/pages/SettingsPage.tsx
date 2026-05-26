import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/base/buttons/button'
import { useUserData } from '@/hooks/useUserData'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { useRegionPreference } from '@/components/providers/RegionProvider'
import { AvatarSelector } from '@/components/settings/AvatarSelector'
import { resolveAvatarUrl } from '@/components/settings/AvatarSelector'
import { Avatar } from '@/components/base/avatar/avatar'
import { User01, Sun, Moon01, Globe01, Eye, SearchMd, Download02, LogOut01 } from '@untitledui/icons'
import { cn } from '@/lib/utils'

const PAUSE_HISTORY_KEY = 'mytube-pause-history'

function SectionCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-2xl border border-gray-200/60 bg-white/50 dark:border-gray-800/40 dark:bg-white/[0.02]', className)}>
      {children}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-400 dark:text-gray-500">
      {children}
    </p>
  )
}

function RowDivider() {
  return <div className="mx-6 border-t border-gray-100/80 dark:border-gray-800/50" />
}

function SettingRow({
  icon: Icon,
  label,
  description,
  children,
}: {
  icon?: React.ComponentType<{ className?: string }>
  label: string
  description?: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-4 px-6 py-4">
      {Icon && (
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gray-100/70 dark:bg-white/[0.04]">
          <Icon className="size-4 text-gray-500 dark:text-gray-400" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
        {description && (
          <p className="mt-0.5 text-[12px] text-gray-500 dark:text-gray-400">{description}</p>
        )}
      </div>
      {children && <div className="shrink-0">{children}</div>}
    </div>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50',
        checked ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-700'
      )}
    >
      <span
        className={cn(
          'inline-block size-4 rounded-full bg-white shadow-sm transition-transform duration-200',
          checked ? 'translate-x-6' : 'translate-x-1'
        )}
      />
    </button>
  )
}

function ConfirmDialog({
  title,
  message,
  onConfirm,
  onCancel,
}: {
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden
      />
      <div className="relative w-full max-w-sm rounded-2xl border border-gray-200/60 bg-white p-6 shadow-2xl dark:border-gray-700/40 dark:bg-gray-900">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{message}</p>
        <div className="mt-5 flex justify-end gap-3">
          <Button onClick={onCancel} color="tertiary" size="sm" className="rounded-xl">
            Cancel
          </Button>
          <Button onClick={onConfirm} color="primary" size="sm" className="rounded-xl">
            Confirm
          </Button>
        </div>
      </div>
    </div>
  )
}

export function SettingsPage() {
  const { user, updateProfile, logout } = useAuth()
  const { username, setUsername, clearHistory, clearSearchHistory, history, searchHistory, favorites, favoriteCreators, playlists, playbackPositions, watchTime } = useUserData()
  const { theme, toggle: toggleTheme } = useTheme()
  const { region, setRegion, regions } = useRegionPreference()

  const displayName = user?.displayName ?? user?.username ?? username
  const [nameInput, setNameInput] = useState(displayName ?? '')
  const [nameSaved, setNameSaved] = useState(false)
  const [pauseHistory, setPauseHistory] = useState(
    () => localStorage.getItem(PAUSE_HISTORY_KEY) === 'true'
  )
  const [confirm, setConfirm] = useState<'search' | 'watch' | null>(null)

  useEffect(() => {
    setNameInput(displayName ?? '')
  }, [displayName])

  const handleSaveName = async () => {
    const trimmed = nameInput.trim()
    if (!trimmed) return
    if (user) {
      await updateProfile({ displayName: trimmed })
    } else {
      setUsername(trimmed)
    }
    setNameSaved(true)
    setTimeout(() => setNameSaved(false), 2000)
  }

  const handleAvatarSelect = async (avatarUrl: string | null) => {
    if (user) {
      await updateProfile({ avatarUrl: avatarUrl ?? undefined })
    }
  }

  const handleTogglePauseHistory = (v: boolean) => {
    setPauseHistory(v)
    localStorage.setItem(PAUSE_HISTORY_KEY, String(v))
  }

  const handleExportData = () => {
    const exportData = {
      username: displayName,
      history,
      searchHistory,
      favorites,
      favoriteCreators,
      playlists,
      playbackPositions,
      watchTime,
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'mytube-data.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <PageHeader
        title="Settings"
        description="Manage your account and preferences"
      />

      {/* Profile section */}
      <div className="space-y-1.5">
        <div className="px-1 pb-1">
          <SectionTitle>Profile</SectionTitle>
        </div>
        <SectionCard>
          {/* Avatar */}
          {user && (
            <>
              <div className="flex flex-col items-center gap-4 px-6 py-6">
                <div className="relative">
                  <Avatar
                    src={resolveAvatarUrl(user.avatarUrl) ?? undefined}
                    size="xl"
                    initials={displayName ? displayName.slice(0, 2).toUpperCase() : 'U'}
                    className="!bg-mytube-blue !text-white size-20"
                  />
                </div>
                <AvatarSelector
                  currentAvatarUrl={user.avatarUrl}
                  onSelect={handleAvatarSelect}
                />
              </div>
              <RowDivider />
            </>
          )}

          {/* Display name */}
          <div className="px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gray-100/70 dark:bg-white/[0.04]">
                <User01 className="size-4 text-gray-500 dark:text-gray-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {user ? 'Display name' : 'Username'}
                </p>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                placeholder="Enter your name"
                maxLength={32}
                className="w-full rounded-xl border border-gray-200/60 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-gray-400 dark:border-gray-700/60 dark:bg-gray-900/50 dark:text-white dark:placeholder-gray-500 dark:focus:border-gray-600"
              />
              <Button
                onClick={handleSaveName}
                color="primary"
                size="sm"
                className="rounded-xl shrink-0"
              >
                {nameSaved ? 'Saved' : 'Save'}
              </Button>
            </div>
          </div>

          {/* Username (read-only when signed in) */}
          {user && (
            <>
              <RowDivider />
              <SettingRow label="Handle" description={`@${user.username}`}>
                <span className="rounded-lg bg-gray-100/70 px-2 py-1 text-[11px] font-medium text-gray-400 dark:bg-white/[0.04] dark:text-gray-500">
                  Read-only
                </span>
              </SettingRow>
            </>
          )}
        </SectionCard>
      </div>

      {/* Appearance section */}
      <div className="space-y-1.5">
        <div className="px-1 pb-1">
          <SectionTitle>Appearance</SectionTitle>
        </div>
        <SectionCard>
          <SettingRow
            icon={theme === 'dark' ? Moon01 : Sun}
            label="Dark mode"
            description={theme === 'dark' ? 'Currently using dark theme' : 'Currently using light theme'}
          >
            <Toggle checked={theme === 'dark'} onChange={() => toggleTheme()} />
          </SettingRow>
          <RowDivider />
          <SettingRow icon={Globe01} label="Region" description="Affects trending content">
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value as Parameters<typeof setRegion>[0])}
              className="rounded-xl border border-gray-200/60 bg-white px-3 py-1.5 text-sm text-gray-700 outline-none transition-colors focus:border-gray-400 dark:border-gray-700/60 dark:bg-gray-900/50 dark:text-gray-200 dark:focus:border-gray-600"
            >
              {regions.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.flag} {r.name}
                </option>
              ))}
            </select>
          </SettingRow>
        </SectionCard>
      </div>

      {/* Privacy section */}
      <div className="space-y-1.5">
        <div className="px-1 pb-1">
          <SectionTitle>Privacy</SectionTitle>
        </div>
        <SectionCard>
          <SettingRow
            icon={Eye}
            label="Pause watch history"
            description="New videos won't be added to your history"
          >
            <Toggle checked={pauseHistory} onChange={handleTogglePauseHistory} />
          </SettingRow>
          <RowDivider />
          <SettingRow
            icon={SearchMd}
            label="Clear search history"
            description={`${searchHistory.length} saved searches`}
          >
            <Button
              onClick={() => setConfirm('search')}
              color="tertiary"
              size="sm"
              className="rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
            >
              Clear
            </Button>
          </SettingRow>
          <RowDivider />
          <SettingRow
            icon={Eye}
            label="Clear watch history"
            description={`${history.length} watched videos`}
          >
            <Button
              onClick={() => setConfirm('watch')}
              color="tertiary"
              size="sm"
              className="rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
            >
              Clear
            </Button>
          </SettingRow>
          <RowDivider />
          <SettingRow
            icon={Download02}
            label="Export my data"
            description="Download a copy of your MyTube data"
          >
            <Button
              onClick={handleExportData}
              color="tertiary"
              size="sm"
              className="rounded-xl"
            >
              Export
            </Button>
          </SettingRow>
        </SectionCard>
      </div>

      {/* Account section */}
      {user && (
        <div className="space-y-1.5">
          <div className="px-1 pb-1">
            <SectionTitle>Account</SectionTitle>
          </div>
          <SectionCard>
            <SettingRow
              icon={User01}
              label="Signed in as"
              description={displayName ?? user.username}
            />
            <RowDivider />
            <SettingRow icon={LogOut01} label="Sign out" description="Sign out on this device">
              <Button
                onClick={() => logout()}
                color="tertiary"
                size="sm"
                className="rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
              >
                Sign out
              </Button>
            </SettingRow>
          </SectionCard>
        </div>
      )}

      {/* Confirmation dialogs */}
      {confirm === 'search' && (
        <ConfirmDialog
          title="Clear search history?"
          message="This will permanently remove all your saved searches."
          onConfirm={() => { clearSearchHistory(); setConfirm(null) }}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm === 'watch' && (
        <ConfirmDialog
          title="Clear watch history?"
          message="This will permanently remove all your watched videos."
          onConfirm={() => { clearHistory(); setConfirm(null) }}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  )
}
