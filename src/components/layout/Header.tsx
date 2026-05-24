import { Link } from 'react-router-dom'
import { useUserData } from '@/hooks/useUserData'
import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence, useMotionValueEvent, useScroll } from 'framer-motion'
import { Button } from '@/components/base/buttons/button'
import { Avatar } from '@/components/base/avatar/avatar'
import { CommandMenu } from '@/components/ui/CommandMenu'
import {
  SearchMd,
  Bell01,
  Sun,
  Moon01,
  Menu04,
  PlusCircle,
  CheckDone01,
} from '@untitledui/icons'
import { useTheme } from '@/hooks/useTheme'
import { useAuth } from '@/hooks/useAuth'
import { resolveAvatarUrl } from '@/components/settings/AvatarSelector'
import { useNotifications } from '@/hooks/useNotifications'
import { formatRelativeTime } from '@/lib/utils'

interface HeaderProps {
  onMenuClick?: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const { theme, toggle } = useTheme()
  const { user } = useAuth()
  const { username: localUsername } = useUserData()
  const displayName = user?.displayName ?? user?.username ?? localUsername
  const [commandOpen, setCommandOpen] = useState(false)
  const [visible, setVisible] = useState(true)
  const [scrolled, setScrolled] = useState(false)
  const [bellOpen, setBellOpen] = useState(false)
  const bellRef = useRef<HTMLDivElement>(null)
  const lastScrollRef = useRef(0)
  const { notifications, unreadCount, markAllRead, dismiss } = useNotifications()

  const { scrollY } = useScroll()

  useMotionValueEvent(scrollY, 'change', (latest) => {
    const prev = lastScrollRef.current
    setScrolled(latest > 12)

    // Only hide after scrolling a bit, and show immediately on scroll up
    if (latest < 60) {
      setVisible(true)
    } else if (latest > prev + 5) {
      setVisible(false) // scrolling down
    } else if (latest < prev - 5) {
      setVisible(true) // scrolling up
    }

    lastScrollRef.current = latest
  })

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Close bell dropdown on outside click
  useEffect(() => {
    if (!bellOpen) return
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [bellOpen])

  return (
    <>
      <motion.header
        initial={{ y: 0, opacity: 1 }}
        animate={{
          y: visible ? 0 : -80,
          opacity: visible ? 1 : 0,
        }}
        transition={{
          duration: 0.35,
          ease: [0.4, 0, 0.2, 1],
        }}
        className={`fixed top-3 right-3 left-3 z-50 flex h-14 items-center gap-3 rounded-2xl border border-transparent px-3 transition-colors duration-500 md:top-4 md:right-6 md:left-6 md:px-5 ${
          scrolled
            ? 'glass'
            : 'bg-transparent'
        }`}
      >
        {/* Left group */}
        <div className="flex items-center gap-1.5">
          <Button
            onClick={onMenuClick}
            color="tertiary"
            size="md"
            className="flex size-10 items-center justify-center rounded-xl md:hidden"
            aria-label="Toggle menu"
            iconLeading={Menu04}
          />
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <span className="text-[17px] font-bold tracking-tight text-gray-900 dark:text-white">
              NØDE
            </span>
          </Link>
        </div>

        {/* Search trigger — center, expands on hover */}
        <motion.button
          onClick={() => setCommandOpen(true)}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="mx-auto flex h-10 w-full max-w-md items-center gap-2.5 rounded-xl border border-gray-200/40 bg-white/50 px-4 text-sm text-gray-400 backdrop-blur-sm transition-all duration-300 hover:border-gray-200/80 hover:bg-white/80 hover:shadow-sm dark:border-gray-800/40 dark:bg-gray-900/50 dark:text-gray-500 dark:hover:border-gray-700/60 dark:hover:bg-gray-900/70"
        >
          <SearchMd className="size-4 shrink-0" />
          <span className="flex-1 text-left truncate">Search...</span>
          <kbd className="hidden rounded-md border border-gray-200/60 bg-gray-50/80 px-1.5 py-0.5 text-[10px] font-medium text-gray-400 dark:border-gray-700/60 dark:bg-gray-800/80 dark:text-gray-500 sm:inline-block">
            ⌘K
          </kbd>
        </motion.button>

        {/* Right group */}
        <div className="flex items-center gap-0.5">
          <Button
            onClick={toggle}
            color="tertiary"
            size="md"
            className="flex size-10 items-center justify-center rounded-xl"
            aria-label={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            iconLeading={theme === 'dark' ? Sun : Moon01}
          />
          <Button
            color="tertiary"
            size="md"
            className="hidden size-10 items-center justify-center rounded-xl md:flex"
            aria-label="Create"
            iconLeading={PlusCircle}
          />
          {/* Bell with dropdown */}
          <div ref={bellRef} className="relative">
            <button
              onClick={() => setBellOpen((o) => !o)}
              className="relative flex size-10 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-gray-100/60 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800/50 dark:hover:text-gray-200"
              aria-label="Notifications"
            >
              <Bell01 className="size-[18px]" />
              {unreadCount > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            <AnimatePresence>
              {bellOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.97 }}
                  transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
                  className="absolute right-0 top-12 z-50 w-80 overflow-hidden rounded-2xl border border-gray-200/50 bg-white/90 shadow-xl backdrop-blur-xl dark:border-gray-700/40 dark:bg-gray-900/90"
                >
                  {/* Dropdown header */}
                  <div className="flex items-center justify-between border-b border-gray-100/80 px-4 py-3 dark:border-gray-800/60">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      Notifications
                    </span>
                    <div className="flex items-center gap-1">
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllRead}
                          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                        >
                          <CheckDone01 className="size-3.5" />
                          Mark all read
                        </button>
                      )}
                      <Link
                        to="/notifications"
                        onClick={() => setBellOpen(false)}
                        className="rounded-lg px-2 py-1 text-xs text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                      >
                        See all
                      </Link>
                    </div>
                  </div>

                  {/* Notification list */}
                  <div className="max-h-[min(420px,60vh)] overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                        <Bell01 className="size-8 text-gray-300 dark:text-gray-600" />
                        <p className="text-sm text-gray-400 dark:text-gray-500">No notifications</p>
                      </div>
                    ) : (
                      notifications.slice(0, 8).map((n) => (
                        <Link
                          key={n.videoId}
                          to={`/watch/${n.videoId}`}
                          onClick={() => { dismiss(n.videoId); setBellOpen(false); }}
                          className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        >
                          <img
                            src={n.thumbnailUrl}
                            alt={n.title}
                            className="mt-0.5 h-10 w-[72px] shrink-0 rounded-md object-cover"
                            loading="lazy"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-2 text-[13px] font-medium leading-snug text-gray-900 dark:text-white">
                              {n.title}
                            </p>
                            <p className="mt-0.5 truncate text-[11px] text-gray-400 dark:text-gray-500">
                              {n.channelName}
                              {n.publishedAt > 0 && (
                                <span className="ml-1">
                                  · {formatRelativeTime(n.publishedAt)}
                                </span>
                              )}
                            </p>
                          </div>
                        </Link>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {user ? (
            <Link
              to="/settings"
              className="ml-1 flex items-center rounded-full p-0.5 transition-all duration-200 hover:ring-2 hover:ring-gray-200/50 dark:hover:ring-gray-700/50"
              aria-label="Settings"
            >
              <Avatar
                src={resolveAvatarUrl(user.avatarUrl) ?? undefined}
                size="sm"
                initials={displayName ? displayName.slice(0, 2).toUpperCase() : 'U'}
                className="!bg-mytube-blue !text-white"
              />
            </Link>
          ) : (
            <Link to="/signin">
              <Button color="tertiary" size="sm" className="rounded-xl">
                Sign in
              </Button>
            </Link>
          )}
        </div>
      </motion.header>

      <CommandMenu isOpen={commandOpen} onClose={() => setCommandOpen(false)} />
    </>
  )
}
