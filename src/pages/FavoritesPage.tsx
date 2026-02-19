import { useState } from 'react'
import { VideoCard } from '@/components/video/VideoCard'
import { useVideosByIds } from '@/hooks/useYouTube'
import { useUserData } from '@/hooks/useUserData'
import { PageHeader } from '@/components/ui/PageHeader'
import { PaginationPageDefault } from '@/components/application/pagination/pagination'
import { Heart } from '@untitledui/icons'

const ITEMS_PER_PAGE = 12

export function FavoritesPage() {
  const { favorites } = useUserData()
  const { videos, loading } = useVideosByIds(favorites)
  const [page, setPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(videos.length / ITEMS_PER_PAGE))
  const paginatedVideos = videos.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  if (favorites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in">
        <div className="flex size-20 items-center justify-center rounded-2xl bg-gray-50 dark:bg-gray-800">
          <Heart className="size-10 text-gray-300 dark:text-gray-600" />
        </div>
        <h2 className="mt-5 text-lg font-semibold text-gray-900 dark:text-white">
          No liked videos yet
        </h2>
        <p className="mt-2 max-w-xs text-sm text-gray-400 dark:text-gray-500">
          Videos you like will appear here. Use the like button on videos to save them.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Liked videos" description="Loading your liked videos..." />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-video rounded-2xl bg-gray-100 dark:bg-gray-800" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (videos.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-gray-400 dark:text-gray-500">
        Could not load some videos.
      </p>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Liked videos"
        description={`${videos.length} video${videos.length === 1 ? '' : 's'} you've liked`}
      />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {paginatedVideos.map((video) => (
          <VideoCard key={video.id} video={video} />
        ))}
      </div>
      {totalPages > 1 && (
        <div className="flex justify-center pt-2">
          <PaginationPageDefault
            page={page}
            total={totalPages}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  )
}
