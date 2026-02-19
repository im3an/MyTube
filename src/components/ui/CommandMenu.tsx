import type { ComponentType } from 'react'
import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  SearchMd,
  Home01,
  Clock,
  Heart,
  Bookmark,
  Folder,
  ArrowRight,
  Sun,
  Moon01,
  Trash01,
  Settings01,
} from '@untitledui/icons'
import { useSearch, useSearchChannels, useVideosByIds } from '@/hooks/useYouTube'
import { useUserData } from '@/hooks/useUserData'
import { useTheme } from '@/hooks/useTheme'
import { useRegionPreference } from '@/hooks/useRegionPreference'
import { categories } from '@/data/mockCategories'
import { Avatar } from '@/components/base/avatar/avatar'
import { formatViews } from '@/api/youtube'
import { useChannelAvatar } from '@/hooks/useChannelAvatar'
import { cx } from '@/utils/cx'

/* ─── Static data ──────────────────────────────────────────── */

const PAGES = [
  { id: 'home', label: 'Home', href: '/', icon: Home01 },
  { id: 'history', label: 'History', href: '/history', icon: Clock },
  { id: 'favorites', label: 'Liked Videos', href: '/favorites', icon: Heart },
  { id: 'watch-later', label: 'Watch Later', href: '/watch-later', icon: Bookmark },
  { id: 'playlists', label: 'Playlists', href: '/playlists', icon: Folder },
  { id: 'settings', label: 'Settings', href: '/settings', icon: Settings01 },
] as const

// Show a curated subset of categories in the idle state
const QUICK_CATEGORIES = categories.filter(
  (c) => c.slug !== 'all'
).slice(0, 5)

/* ─── Types ────────────────────────────────────────────────── */

interface CommandItem {
  type: 'action' | 'page' | 'category' | 'video' | 'channel' | 'search-history'
  id: string
  label: string
  href?: string
  sublabel?: string
  thumbnail?: string
  channelVerified?: boolean
  channelAvatar?: string
  subscriberCount?: number
  icon?: ComponentType<{ className?: string }>
  onAction?: () => void
  kbd?: string
}

export interface CommandMenuProps {
  isOpen: boolean
  onClose: () => void
}

/* ─── Channel avatar with resolved image ───────────────────── */

function ChannelAvatar({
  channelId,
  avatarUrl,
  verified,
}: {
  channelId: string
  avatarUrl: string
  verified?: boolean
}) {
  const resolvedAvatar = useChannelAvatar(channelId, avatarUrl)
  return (
    <Avatar
      src={resolvedAvatar}
      alt=""
      size="sm"
      verified={verified}
      className="shrink-0"
    />
  )
}

/* ─── Section heading ──────────────────────────────────────── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-2 pb-1 pt-4 first:pt-2 text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
      {children}
    </div>
  )
}

/* ─── Component ────────────────────────────────────────────── */

export function CommandMenu({ isOpen, onClose }: CommandMenuProps) {
  const [query, setQuery] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [userNavigated, setUserNavigated] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { theme, toggle: toggleTheme } = useTheme()
  const { region } = useRegionPreference()
  const { videos: searchVideos, loading } = useSearch(query.trim() || null)
  const { channels: searchChannels } = useSearchChannels(
    query.trim().length > 0 ? query.trim() : null,
    region
  )
  const { history, clearHistory, searchHistory, addSearchToHistory } = useUserData()
  const recentIds = history.slice(0, 5).map((h) => h.videoId)
  const { videos: recentVideos } = useVideosByIds(recentIds)

  const trimmedQuery = query.trim().toLowerCase()
  const hasQuery = trimmedQuery.length > 0

  const goToSearch = useCallback((searchQuery?: string) => {
    const q = (searchQuery ?? query).trim()
    if (!q) return
    addSearchToHistory(q)
    navigate(`/search?q=${encodeURIComponent(q)}`)
    onClose()
    setQuery('')
    setHighlightedIndex(-1)
    setUserNavigated(false)
  }, [query, navigate, onClose, addSearchToHistory])

  /* ── Build item lists ─────────────────────────── */

  // Quick actions (idle only)
  const quickActions: CommandItem[] = useMemo(
    () =>
      hasQuery
        ? []
        : [
            {
              type: 'action',
              id: 'toggle-theme',
              label: theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode',
              icon: theme === 'dark' ? Sun : Moon01,
              onAction: () => {
                toggleTheme()
                onClose()
              },
            },
            ...(history.length > 0
              ? [
                  {
                    type: 'action' as const,
                    id: 'clear-history',
                    label: 'Clear watch history',
                    icon: Trash01,
                    onAction: () => {
                      clearHistory()
                      onClose()
                    },
                  },
                ]
              : []),
          ],
    [hasQuery, theme, toggleTheme, onClose, history.length, clearHistory]
  )

  // Categories (idle: curated subset; query: filtered)
  const categoryItems: CommandItem[] = useMemo(() => {
    if (hasQuery) {
      const matched = categories.filter(
        (c) =>
          c.slug !== 'all' &&
          (c.label.toLowerCase().includes(trimmedQuery) ||
            c.keywords.some((k) => k.toLowerCase().includes(trimmedQuery)))
      )
      return matched.length > 0
        ? matched.map((c) => ({
            type: 'category' as const,
            id: `cat-${c.id}`,
            label: c.label,
            sublabel: c.description,
            href: `/category/${c.slug}`,
            icon: c.icon as ComponentType<{ className?: string }>,
          }))
        : []
    }
    return QUICK_CATEGORIES.map((c) => ({
      type: 'category' as const,
      id: `cat-${c.id}`,
      label: c.label,
      href: `/category/${c.slug}`,
      icon: c.icon as ComponentType<{ className?: string }>,
    }))
  }, [hasQuery, trimmedQuery])

  // Pages
  const filteredPages: CommandItem[] = useMemo(
    () =>
      (hasQuery
        ? PAGES.filter((p) => p.label.toLowerCase().includes(trimmedQuery))
        : PAGES
      ).map((p) => ({
        type: 'page' as const,
        id: p.id,
        label: p.label,
        href: p.href,
        icon: p.icon as ComponentType<{ className?: string }>,
      })),
    [hasQuery, trimmedQuery]
  )

  // Channels (when searching)
  const channelItems: CommandItem[] = useMemo(() => {
    if (!hasQuery || searchChannels.length === 0) return []
    return searchChannels.slice(0, 5).map((c) => ({
      type: 'channel' as const,
      id: `channel-${c.id}`,
      label: c.name,
      href: `/channel/${c.id}`,
      sublabel: c.subscriberCount > 0 ? `${formatViews(c.subscriberCount)} subscribers` : undefined,
      channelAvatar: c.avatarUrl,
      channelVerified: c.verified,
    }))
  }, [hasQuery, searchChannels])

  // Videos
  const videoItems: CommandItem[] = useMemo(() => {
    const vids = hasQuery ? searchVideos : recentVideos.slice(0, 5)
    return vids.map((v) => ({
      type: 'video' as const,
      id: v.id,
      label: v.title,
      href: `/watch/${v.id}`,
      sublabel: v.channelName,
      thumbnail: v.thumbnail,
      channelVerified: v.channelVerified,
    }))
  }, [hasQuery, searchVideos, recentVideos])

  // Search history (when empty: recent; when typing: matching)
  const searchHistoryItems: CommandItem[] = useMemo(() => {
    if (searchHistory.length === 0) return []
    const filtered = hasQuery
      ? searchHistory.filter((e) => e.query.toLowerCase().includes(trimmedQuery))
      : searchHistory.slice(0, 5)
    return filtered.map((e) => ({
      type: 'search-history' as const,
      id: `search-${e.query}`,
      label: e.query,
      icon: Clock,
      onAction: () => goToSearch(e.query),
    }))
  }, [searchHistory, hasQuery, trimmedQuery, goToSearch])

  // Assemble all items in section order
  const allItems = useMemo(
    () => [...searchHistoryItems, ...quickActions, ...filteredPages, ...categoryItems, ...channelItems, ...videoItems],
    [searchHistoryItems, quickActions, filteredPages, categoryItems, channelItems, videoItems]
  )

  /* ── Handlers ─────────────────────────────────── */

  const selectItem = useCallback(
    (item: CommandItem) => {
      if (item.onAction) {
        item.onAction()
      } else if (item.href) {
        navigate(item.href)
        onClose()
      }
      setQuery('')
      setHighlightedIndex(-1)
      setUserNavigated(false)
    },
    [navigate, onClose]
  )

  /* ── Effects ──────────────────────────────────── */

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setHighlightedIndex(-1)
      setUserNavigated(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  useEffect(() => {
    setHighlightedIndex(-1)
    setUserNavigated(false)
  }, [query])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!isOpen) return
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setUserNavigated(true)
        setHighlightedIndex((i) => Math.min(i + 1, allItems.length - 1))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setUserNavigated(true)
        setHighlightedIndex((i) => Math.max(i - 1, 0))
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        if (userNavigated && highlightedIndex >= 0 && allItems[highlightedIndex]) {
          selectItem(allItems[highlightedIndex])
        } else {
          goToSearch()
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, highlightedIndex, allItems, onClose, selectItem, goToSearch, userNavigated])

  useEffect(() => {
    if (highlightedIndex >= 0) {
      listRef.current
        ?.querySelector(`[data-index="${highlightedIndex}"]`)
        ?.scrollIntoView({ block: 'nearest' })
    }
  }, [highlightedIndex])

  /* ── Render helpers ───────────────────────────── */

  // Compute the global index of an item
  let globalIdx = 0
  const nextIndex = () => globalIdx++

  const renderItem = (item: CommandItem, idx: number) => {
    const isHighlighted = idx === highlightedIndex
    const isVideo = item.type === 'video'
    const isChannel = item.type === 'channel'
    const Icon = item.icon

    return (
      <button
        key={item.id}
        data-index={idx}
        type="button"
        role="option"
        aria-selected={isHighlighted}
        onClick={() => selectItem(item)}
        className={cx(
          'group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-all duration-150',
          isHighlighted
            ? 'bg-gray-100/80 dark:bg-white/[0.06]'
            : 'hover:bg-gray-50/80 dark:hover:bg-white/[0.03]'
        )}
      >
        {/* Icon / Thumbnail / Avatar */}
        {isVideo && item.thumbnail ? (
          <div className="relative h-10 w-[72px] shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
            <img
              src={item.thumbnail}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        ) : isChannel && item.channelAvatar ? (
          <ChannelAvatar channelId={item.id.replace('channel-', '')} avatarUrl={item.channelAvatar} verified={item.channelVerified} />
        ) : Icon ? (
          <span
            className={cx(
              'flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors duration-150',
              'bg-gray-100/80 text-gray-500 dark:bg-white/[0.05] dark:text-gray-400'
            )}
          >
            <Icon className="size-4" />
          </span>
        ) : null}

        {/* Label */}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-gray-700 dark:text-gray-300">
            {item.label}
          </div>
          {item.sublabel && (
            <div className="truncate text-xs text-gray-400 dark:text-gray-500">
              {item.sublabel}
            </div>
          )}
        </div>

        {/* Trailing */}
        {item.kbd ? (
          <kbd className="hidden rounded-md border border-gray-200/50 bg-gray-50/80 px-1.5 py-0.5 text-[9px] font-medium text-gray-400 dark:border-gray-700/50 dark:bg-gray-800/80 dark:text-gray-500 sm:inline-block">
            {item.kbd}
          </kbd>
        ) : item.type !== 'video' && item.type !== 'channel' ? (
          <ArrowRight className="size-3.5 text-gray-300 opacity-0 transition-opacity duration-150 group-hover:opacity-100 dark:text-gray-600" />
        ) : null}
      </button>
    )
  }

  /* ── Section rendering with proper index tracking ─── */

  const renderSections = () => {
    globalIdx = 0
    const sections: React.ReactNode[] = []

    // Search history
    if (searchHistoryItems.length > 0) {
      const items = searchHistoryItems.map((item) => {
        const idx = nextIndex()
        return renderItem(item, idx)
      })
      sections.push(
        <div key="search-history">
          <SectionLabel>Recent searches</SectionLabel>
          {items}
        </div>
      )
    }

    // Quick Actions
    if (quickActions.length > 0) {
      const items = quickActions.map((item) => {
        const idx = nextIndex()
        return renderItem(item, idx)
      })
      sections.push(
        <div key="actions">
          <SectionLabel>Quick Actions</SectionLabel>
          {items}
        </div>
      )
    }

    // Pages
    if (filteredPages.length > 0) {
      const items = filteredPages.map((item) => {
        const idx = nextIndex()
        return renderItem(item, idx)
      })
      sections.push(
        <div key="pages">
          <SectionLabel>{hasQuery ? 'Pages' : 'Go to'}</SectionLabel>
          {items}
        </div>
      )
    }

    // Categories
    if (categoryItems.length > 0) {
      if (hasQuery) {
        // List view when searching
        const items = categoryItems.map((item) => {
          const idx = nextIndex()
          return renderItem(item, idx)
        })
        sections.push(
          <div key="categories">
            <SectionLabel>Categories</SectionLabel>
            {items}
          </div>
        )
      } else {
        // Grid view when idle
        const items = categoryItems.map((item) => {
          const idx = nextIndex()
          const isHighlighted = idx === highlightedIndex
          const Icon = item.icon
          return (
            <button
              key={item.id}
              data-index={idx}
              type="button"
              role="option"
              aria-selected={isHighlighted}
              onClick={() => selectItem(item)}
              className={cx(
                'flex flex-col items-center gap-1 rounded-lg px-2 py-2.5 text-center transition-all duration-150',
                isHighlighted
                  ? 'bg-gray-100/80 dark:bg-white/[0.06]'
                  : 'hover:bg-gray-50/80 dark:hover:bg-white/[0.03]'
              )}
            >
              <span className="flex size-9 items-center justify-center rounded-xl bg-gray-100/80 text-gray-500 dark:bg-white/[0.06] dark:text-gray-400">
                {Icon && <Icon className="size-4.5" />}
              </span>
              <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                {item.label}
              </span>
            </button>
          )
        })
        sections.push(
          <div key="categories">
            <SectionLabel>Browse</SectionLabel>
            <div className="grid grid-cols-4 gap-1.5 px-1">
              {items}
            </div>
          </div>
        )
      }
    }

    // Channels (when searching)
    if (channelItems.length > 0) {
      const items = channelItems.map((item) => {
        const idx = nextIndex()
        return renderItem(item, idx)
      })
      sections.push(
        <div key="channels">
          <SectionLabel>Channels</SectionLabel>
          {items}
        </div>
      )
    }

    // Videos / Recent
    if (videoItems.length > 0) {
      const items = videoItems.map((item) => {
        const idx = nextIndex()
        return renderItem(item, idx)
      })
      sections.push(
        <div key="videos">
          <SectionLabel>{hasQuery ? 'Videos' : 'Recently watched'}</SectionLabel>
          {items}
        </div>
      )
    }

    // Loading state
    if (hasQuery && loading) {
      sections.push(
        <div key="loading" className="flex items-center justify-center gap-2 py-8">
          <div className="size-4 animate-spin rounded-full border-2 border-gray-200 border-t-gray-500 dark:border-gray-700 dark:border-t-gray-400" />
          <span className="text-sm text-gray-400 dark:text-gray-500">Searching...</span>
        </div>
      )
    }

    // Empty state
    if (hasQuery && !loading && searchVideos.length === 0 && filteredPages.length === 0 && categoryItems.length === 0 && channelItems.length === 0) {
      sections.push(
        <div key="empty" className="py-10 text-center">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-gray-100 dark:bg-white/[0.04]">
            <SearchMd className="size-5 text-gray-400 dark:text-gray-500" />
          </div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No results found</p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Try a different search term</p>
        </div>
      )
    }

    return sections
  }

  /* ─── Render ──────────────────────────────────── */

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[100] bg-black/25 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Dialog */}
          <div className="fixed inset-4 z-[100] flex items-start justify-center pt-[10vh] sm:inset-8 sm:pt-[14vh]">
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-gray-200/40 bg-white/90 shadow-xl backdrop-blur-xl dark:border-gray-800/40 dark:bg-gray-900/90"
          >
              {/* Search input */}
              <div className="border-b border-gray-200/30 px-4 py-3 dark:border-gray-800/30">
                <div className="flex items-center gap-3">
                  <SearchMd className="size-5 shrink-0 text-gray-400 dark:text-gray-500" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search..."
                    autoFocus
                    className="flex-1 bg-transparent text-[15px] text-gray-900 placeholder-gray-400 outline-none dark:text-gray-100 dark:placeholder-gray-500"
                  />
                  <kbd
                    onClick={onClose}
                    className="cursor-pointer rounded-md border border-gray-200/40 bg-gray-50/60 px-1.5 py-0.5 text-[10px] font-medium text-gray-400 dark:border-gray-700/40 dark:bg-gray-800/60 dark:text-gray-500"
                  >
                    esc
                  </kbd>
                </div>
              </div>

              {/* Results */}
              <div
                ref={listRef}
                className="max-h-[60vh] overflow-y-auto overscroll-contain p-2 scrollbar-hide"
                role="listbox"
              >
                {renderSections()}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
