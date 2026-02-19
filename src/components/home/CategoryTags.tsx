import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Globe01 } from '@untitledui/icons'
import { categories } from '@/data/mockCategories'
import { useRegionPreference } from '@/components/providers/RegionProvider'
import { cn } from '@/lib/utils'

interface CategoryTagsProps {
  selectedSlug: string
}

export function CategoryTags({ selectedSlug }: CategoryTagsProps) {
  const navigate = useNavigate()
  const { region, setRegion, regionInfo, regions } = useRegionPreference()
  const [countryOpen, setCountryOpen] = useState(false)

  const handleCategoryChange = (slug: string) => {
    navigate(slug === 'all' ? '/' : `/?category=${slug}`, { replace: true })
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Category chips */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-1">
        <div className="flex shrink-0 gap-1.5">
          {categories.map((cat) => {
            const isSelected = selectedSlug === cat.slug
            const Icon = cat.icon
            return (
              <button
                key={cat.id}
                onClick={() => handleCategoryChange(cat.slug)}
                className={cn(
                  'relative flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-[13px] font-medium transition-all duration-200',
                  isSelected
                    ? 'text-white shadow-sm dark:text-gray-900'
                    : 'bg-white/60 text-gray-500 ring-1 ring-gray-200/50 backdrop-blur-sm hover:bg-white/90 hover:text-gray-900 hover:ring-gray-300/60 dark:bg-white/[0.04] dark:text-gray-400 dark:ring-gray-700/40 dark:hover:bg-white/[0.08] dark:hover:text-white'
                )}
                title={cat.description}
              >
                {isSelected && (
                  <motion.span
                    layoutId="category-pill"
                    className="absolute inset-0 rounded-xl bg-gray-900 dark:bg-white"
                    style={{ zIndex: 0 }}
                    transition={{ type: 'spring', bounce: 0.18, duration: 0.5 }}
                  />
                )}
                <Icon className="relative z-10 size-3.5" />
                <span className="relative z-10">{cat.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Region selector — filters trending by country/language */}
      <div className="relative shrink-0">
        <button
          onClick={() => setCountryOpen((o) => !o)}
          className={cn(
            'flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[13px] font-medium transition-all duration-200',
            'bg-white/60 text-gray-600 ring-1 ring-gray-200/50 backdrop-blur-sm',
            'hover:bg-white/90 hover:text-gray-900 hover:ring-gray-300/60',
            'dark:bg-white/[0.04] dark:text-gray-400 dark:ring-gray-700/40',
            'dark:hover:bg-white/[0.08] dark:hover:text-white'
          )}
          aria-expanded={countryOpen}
          aria-haspopup="listbox"
          aria-label="Select region for trending videos"
        >
          <Globe01 className="size-3.5 text-gray-500 dark:text-gray-400" />
          <span className="text-base leading-none">{regionInfo.flag}</span>
          <span>{regionInfo.code}</span>
          <ChevronDown
            className={cn('size-3.5 transition-transform', countryOpen && 'rotate-180')}
          />
        </button>

        <AnimatePresence>
          {countryOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                aria-hidden
                onClick={() => setCountryOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full z-50 mt-2 max-h-64 w-56 overflow-y-auto rounded-xl border border-gray-200/60 bg-white/95 py-2 shadow-xl backdrop-blur-xl dark:border-gray-700/50 dark:bg-gray-900/95"
                role="listbox"
              >
                <p className="px-4 py-2 text-[11px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Trending from
                </p>
                {regions.map((r) => (
                  <button
                    key={r.code}
                    onClick={() => {
                      setRegion(r.code)
                      setCountryOpen(false)
                    }}
                    role="option"
                    aria-selected={region === r.code}
                    className={cn(
                      'flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors',
                      region === r.code
                        ? 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white'
                        : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800/80'
                    )}
                  >
                    <span className="text-lg">{r.flag}</span>
                    <span className="flex-1 font-medium">{r.name}</span>
                    {region === r.code && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">✓</span>
                    )}
                  </button>
                ))}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
