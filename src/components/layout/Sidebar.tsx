import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  VideoRecorder,
  Clock,
  Heart,
  Bookmark,
  ChevronLeft,
  Play,
  Tv01,
  Signal01,
  Home01,
  Zap,
  Users01,
  TrendUp01,
  Settings01,
  Announcement02,
  Download01,
} from '@untitledui/icons'
import { Avatar } from '@/components/base/avatar/avatar'
import { useUserData } from '@/hooks/useUserData'
import { useChannelAvatar } from '@/hooks/useChannelAvatar'
import { cn } from '@/lib/utils'

const mainNav = [
  { to: '/', icon: Home01, label: 'Home' },
  { to: '/shorts', icon: Zap, label: 'Shorts' },
  { to: '/subscriptions', icon: Users01, label: 'Your creators' },
]

const libraryNav = [
  { to: '/history', icon: Clock, label: 'History' },
  { to: '/playlists', icon: VideoRecorder, label: 'Your videos' },
  { to: '/watch-later', icon: Bookmark, label: 'Watch later' },
  { to: '/favorites', icon: Heart, label: 'Liked videos' },
  { to: '/download', icon: Download01, label: 'Download' },
  { to: '/settings', icon: Settings01, label: 'Settings' },
]

const moreNav = [
  { to: '/category/trending', icon: TrendUp01, label: 'Trending' },
  { to: '/premium', icon: Play, label: 'Premium' },
  { to: '/gaming', icon: Tv01, label: 'Gaming' },
  { to: '/news', icon: Announcement02, label: 'News' },
  { to: '/live', icon: Signal01, label: 'Live' },
]

interface SidebarProps {
  collapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
  mobileOpen?: boolean
  onMobileClose?: () => void
}

function CreatorLink({
  id,
  name,
  avatar,
  onClick,
}: {
  id: string
  name: string
  avatar?: string
  onClick: () => void
}) {
  const channelAvatar = useChannelAvatar(id, avatar ?? '')
  return (
    <Link
      to={`/channel/${id}`}
      onClick={onClick}
      className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] text-gray-500 transition-all duration-200 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
    >
      <Avatar src={channelAvatar} alt={name} size="xs" className="shrink-0" />
      <span className="truncate">{name}</span>
    </Link>
  )
}

export function Sidebar({
  collapsed = false,
  onCollapsedChange,
  mobileOpen = false,
  onMobileClose,
}: SidebarProps) {
  const location = useLocation()
  const { favoriteCreators } = useUserData()

  const isActive = (to: string) =>
    location.pathname === to ||
    (to !== '/' && location.pathname.startsWith(to))

  const linkClass = (to: string) =>
    cn(
      'group/link relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-all duration-200',
      isActive(to)
        ? 'text-gray-900 dark:text-white'
        : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200',
      collapsed && 'justify-center px-0'
    )

  const renderNavSection = (
    items: typeof mainNav,
    label?: string
  ) => (
    <div className="space-y-0.5">
      {label && !collapsed && (
        <p className="mb-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-400 dark:text-gray-600">
          {label}
        </p>
      )}
      {items.map(({ to, icon: Icon, label: itemLabel }) => (
        <Link
          key={to}
          to={to}
          onClick={onMobileClose}
          className={linkClass(to)}
          title={collapsed ? itemLabel : undefined}
        >
          {/* Active indicator dot */}
          {isActive(to) && (
            <motion.div
              layoutId="sidebar-active"
              className="absolute inset-0 rounded-lg bg-gray-100/80 dark:bg-white/[0.06]"
              transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
            />
          )}
          <Icon
            className={cn(
              'relative z-10 size-[18px] shrink-0 transition-colors duration-200',
              isActive(to)
                ? 'text-gray-900 dark:text-white'
                : 'text-gray-400 group-hover/link:text-gray-600 dark:text-gray-500 dark:group-hover/link:text-gray-300'
            )}
          />
          {!collapsed && <span className="relative z-10">{itemLabel}</span>}
        </Link>
      ))}
    </div>
  )

  return (
    <aside
      className={cn(
        'fixed left-3 z-40 overflow-y-auto overflow-x-hidden rounded-xl border border-gray-200/40 bg-white/70 backdrop-blur-2xl transition-all duration-300 scrollbar-hide dark:border-gray-800/30 dark:bg-gray-950/70',
        'top-24 bottom-8',
        !collapsed && 'md:top-[5.5rem] md:bottom-4 md:left-4',
        collapsed && 'md:top-[5.5rem] md:bottom-auto md:left-4 md:h-fit md:max-h-[calc(100vh-7rem)]',
        'md:translate-x-0',
        mobileOpen ? 'translate-x-0' : '-translate-x-[calc(100%+1rem)]',
        collapsed ? 'md:w-[52px]' : 'md:w-56',
        'w-60 md:left-4',
      )}
    >
      <nav className="flex flex-col gap-0.5 p-2 pb-5">
        {renderNavSection(mainNav)}

        <div className={cn('my-1.5 border-t border-gray-100/80 dark:border-gray-800/50', collapsed ? 'mx-1' : 'mx-2')} />

        {renderNavSection(libraryNav, 'Library')}

        <div className={cn('my-1.5 border-t border-gray-100/80 dark:border-gray-800/50', collapsed ? 'mx-1' : 'mx-2')} />

        {/* Your creators (favorites) */}
        {!collapsed && (
          <div className="space-y-0.5">
            <p className="mb-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-400 dark:text-gray-600">
              Your creators
            </p>
            {favoriteCreators.length === 0 ? (
              <p className="px-2.5 py-2 text-[11px] text-gray-400 dark:text-gray-500">
                Visit a channel and tap the heart to add creators here.
              </p>
            ) : (
              favoriteCreators.map(({ id, name, avatar }) => (
                <CreatorLink
                  key={id}
                  id={id}
                  name={name}
                  avatar={avatar}
                  onClick={onMobileClose ?? (() => {})}
                />
              ))
            )}
          </div>
        )}

        {!collapsed && (
          <>
            <div className="my-1.5 mx-2 border-t border-gray-100/80 dark:border-gray-800/50" />
            {renderNavSection(moreNav, 'Explore')}
          </>
        )}

        {/* Collapse */}
        {onCollapsedChange && (
          <button
            onClick={() => onCollapsedChange(!collapsed)}
            className={cn(
              'mt-2 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-gray-400 transition-all duration-200 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300',
              collapsed && 'justify-center px-0'
            )}
          >
            <ChevronLeft
              className={cn(
                'size-[18px] shrink-0 transition-transform duration-300',
                collapsed && 'rotate-180'
              )}
            />
            {!collapsed && <span>Collapse</span>}
          </button>
        )}
      </nav>
    </aside>
  )
}
