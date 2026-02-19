import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Clock,
  TrendUp01,
  User01,
  Signal01,
  Zap,
  Film01,
  Hourglass01,
} from '@untitledui/icons'
import { cn } from '@/lib/utils'

export type SortOption = 'relevant' | 'recent' | 'popular'
export type FilterOption =
  | 'all'
  | 'from-my-channels'
  | 'live'
  | 'shorts'
  | 'long'

const SORT_OPTIONS: { value: SortOption; label: string; icon: typeof Clock }[] = [
  { value: 'relevant', label: 'Relevant', icon: Film01 },
  { value: 'recent', label: 'Recent', icon: Clock },
  { value: 'popular', label: 'Popular', icon: TrendUp01 },
]

const FILTER_OPTIONS: {
  value: FilterOption
  label: string
  icon: typeof Signal01
}[] = [
  { value: 'all', label: 'All', icon: Film01 },
  { value: 'from-my-channels', label: 'From my channels', icon: User01 },
  { value: 'live', label: 'Live', icon: Signal01 },
  { value: 'shorts', label: 'Shorts', icon: Zap },
  { value: 'long', label: 'Long', icon: Hourglass01 },
]

const SORT_PARAM = 'sort'
const FILTER_PARAM = 'filter'

export function useSearchFilters() {
  const [searchParams, setSearchParams] = useSearchParams()

  const sort =
    (searchParams.get(SORT_PARAM) as SortOption) || 'relevant'
  const filter =
    (searchParams.get(FILTER_PARAM) as FilterOption) || 'all'

  const setSort = (value: SortOption) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value === 'relevant') next.delete(SORT_PARAM)
        else next.set(SORT_PARAM, value)
        return next
      },
      { replace: true }
    )
  }

  const setFilter = (value: FilterOption) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value === 'all') next.delete(FILTER_PARAM)
        else next.set(FILTER_PARAM, value)
        return next
      },
      { replace: true }
    )
  }

  return { sort, filter, setSort, setFilter }
}

interface SearchFilterBarProps {
  hasFavoriteChannels?: boolean
}

export function SearchFilterBar({ hasFavoriteChannels = false }: SearchFilterBarProps) {
  const { sort, filter, setSort, setFilter } = useSearchFilters()

  return (
    <div className="flex flex-col gap-3">
      {/* Sort */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Sort
        </span>
        <div className="flex flex-wrap gap-1.5">
          {SORT_OPTIONS.map((opt) => {
            const isSelected = sort === opt.value
            const Icon = opt.icon
            return (
              <button
                key={opt.value}
                onClick={() => setSort(opt.value)}
                className={cn(
                  'relative flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-[13px] font-medium transition-all duration-200',
                  isSelected
                    ? 'text-white shadow-sm dark:text-gray-900'
                    : 'bg-white/60 text-gray-500 ring-1 ring-gray-200/50 backdrop-blur-sm hover:bg-white/90 hover:text-gray-900 hover:ring-gray-300/60 dark:bg-white/[0.04] dark:text-gray-400 dark:ring-gray-700/40 dark:hover:bg-white/[0.08] dark:hover:text-white'
                )}
              >
                {isSelected && (
                  <motion.span
                    layoutId={`search-sort-${opt.value}`}
                    className="absolute inset-0 rounded-xl bg-gray-900 dark:bg-white"
                    style={{ zIndex: 0 }}
                    transition={{ type: 'spring', bounce: 0.18, duration: 0.5 }}
                  />
                )}
                <Icon className="relative z-10 size-3.5" />
                <span className="relative z-10">{opt.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Filter
        </span>
        <div className="flex flex-wrap gap-1.5">
          {FILTER_OPTIONS.map((opt) => {
            if (opt.value === 'from-my-channels' && !hasFavoriteChannels) return null
            const isSelected = filter === opt.value
            const Icon = opt.icon
            return (
              <button
                key={opt.value}
                onClick={() => setFilter(opt.value)}
                className={cn(
                  'relative flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-[13px] font-medium transition-all duration-200',
                  isSelected
                    ? 'text-white shadow-sm dark:text-gray-900'
                    : 'bg-white/60 text-gray-500 ring-1 ring-gray-200/50 backdrop-blur-sm hover:bg-white/90 hover:text-gray-900 hover:ring-gray-300/60 dark:bg-white/[0.04] dark:text-gray-400 dark:ring-gray-700/40 dark:hover:bg-white/[0.08] dark:hover:text-white'
                )}
              >
                {isSelected && (
                  <motion.span
                    layoutId={`search-filter-${opt.value}`}
                    className="absolute inset-0 rounded-xl bg-gray-900 dark:bg-white"
                    style={{ zIndex: 0 }}
                    transition={{ type: 'spring', bounce: 0.18, duration: 0.5 }}
                  />
                )}
                <Icon className="relative z-10 size-3.5" />
                <span className="relative z-10">{opt.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
