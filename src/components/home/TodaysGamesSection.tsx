import { motion } from 'framer-motion'
import { GameCard } from '@/components/home/GameCard'
import { useTodaysGames } from '@/hooks/useTodaysGames'
import type { FreeToGameItem } from '@/api/freetogame'

export function TodaysGamesSection() {
  const { games, loading, error } = useTodaysGames(6)

  if (loading) {
    return (
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">
            Today&apos;s selection
          </h2>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            Free-to-play games
          </span>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-video rounded-2xl bg-gray-100 dark:bg-gray-800" />
              <div className="mt-3 flex gap-3">
                <div className="size-9 shrink-0 rounded-full bg-gray-100 dark:bg-gray-800" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 rounded-lg bg-gray-100 dark:bg-gray-800" />
                  <div className="h-3 w-1/2 rounded-lg bg-gray-100 dark:bg-gray-800" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    )
  }

  if (error || games.length === 0) {
    return null
  }

  return (
    <motion.section
      className="space-y-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">
          Today&apos;s selection
        </h2>
        <a
          href="https://www.freetogame.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
        >
          via FreeToGame
        </a>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {games.map((game: FreeToGameItem, i: number) => (
          <GameCard key={game.id} game={game} index={i} />
        ))}
      </div>
    </motion.section>
  )
}
