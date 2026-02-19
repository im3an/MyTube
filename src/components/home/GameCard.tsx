import { useState, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { GamingPad01 } from '@untitledui/icons'
import type { FreeToGameItem } from '@/api/freetogame'

interface GameCardProps {
  game: FreeToGameItem
  index?: number
}

export function GameCard({ game, index = 0 }: GameCardProps) {
  const [hovered, setHovered] = useState(false)
  const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 })
  const cardRef = useRef<HTMLDivElement>(null)

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    setMouse({ x, y })
  }, [])

  const tiltY = (mouse.x - 0.5) * 16
  const tiltX = (mouse.y - 0.5) * -14

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{
        opacity: 1,
        y: 0,
        rotateX: hovered ? tiltX : 0,
        rotateY: hovered ? tiltY : 0,
      }}
      transition={{
        opacity: { duration: 0.5, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] },
        y: { duration: 0.5, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] },
        rotateX: { type: 'spring', stiffness: 350, damping: 20 },
        rotateY: { type: 'spring', stiffness: 350, damping: 20 },
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseMove={handleMouseMove}
      className="relative overflow-visible rounded-2xl"
      style={{ perspective: 800, transformStyle: 'preserve-3d' }}
    >
      {/* Color blur splash — matches VideoCard style */}
      <div
        className="absolute -inset-6 -z-10 scale-[1.08] rounded-3xl transition-opacity duration-300"
        style={{
          backgroundImage: `url(${game.thumbnail})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(28px) saturate(1.3)',
          opacity: hovered ? 0.4 : 0.12,
        }}
        aria-hidden="true"
      />

      <a
        href={game.game_url}
        target="_blank"
        rel="noopener noreferrer"
        className="group block"
      >
        <motion.div
          className="relative aspect-video overflow-hidden rounded-2xl bg-gray-100 dark:bg-gray-800/50"
          animate={{
            scale: hovered ? 1.04 : 1,
            boxShadow: hovered
              ? '0 12px 40px rgba(0, 0, 0, 0.18), 0 4px 12px rgba(0, 0, 0, 0.08)'
              : '0 0px 0px rgba(0, 0, 0, 0)',
          }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        >
          <img
            src={game.thumbnail}
            alt={game.title}
            className="h-full w-full object-cover"
            loading="lazy"
          />

          {/* Cinematic overlay on hover */}
          <motion.div
            className="absolute inset-0 z-20 bg-gradient-to-t from-black/40 via-transparent to-transparent"
            animate={{ opacity: hovered ? 1 : 0 }}
            transition={{ duration: 0.3 }}
          />

          {/* Play/Launch icon on hover */}
          <motion.div
            className="absolute inset-0 z-20 flex items-center justify-center"
            animate={{ opacity: hovered ? 1 : 0, scale: hovered ? 1 : 0.8 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          >
            <div className="flex size-12 items-center justify-center rounded-full bg-white/90 shadow-lg backdrop-blur-sm dark:bg-black/60">
              <GamingPad01 className="size-6 text-gray-900 dark:text-white" />
            </div>
          </motion.div>

          {/* Genre badge */}
          <span className="absolute bottom-2.5 left-2.5 z-20 rounded-lg bg-black/50 px-2 py-0.5 text-[11px] font-medium text-white/90 backdrop-blur-sm">
            {game.genre}
          </span>
        </motion.div>

        {/* Info — matches VideoCard layout */}
        <div className="mt-3.5 flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
            <GamingPad01 className="size-4 text-gray-500 dark:text-gray-400" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 text-[15px] font-medium leading-snug text-gray-900 transition-colors duration-200 group-hover:text-gray-950 dark:text-gray-100 dark:group-hover:text-white">
              {game.title}
            </h3>
            <p className="mt-1 text-sm font-medium text-gray-600 dark:text-gray-300">
              {game.developer}
            </p>
            <p className="mt-0.5 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
              {game.short_description}
            </p>
          </div>
        </div>
      </a>
    </motion.div>
  )
}
