import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { Avatar } from '@/components/base/avatar/avatar'
import { useUserData } from '@/hooks/useUserData'
import { useChannelAvatar } from '@/hooks/useChannelAvatar'
import { Heart } from '@untitledui/icons'

function CreatorCard({
  id,
  name,
  avatar,
}: {
  id: string
  name: string
  avatar?: string
}) {
  const channelAvatar = useChannelAvatar(id, avatar ?? '')
  return (
    <Link
      to={`/channel/${id}`}
      className="group flex flex-col items-center gap-3 rounded-2xl p-5 transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800/50 animate-slide-up"
    >
      <Avatar
        src={channelAvatar}
        alt={name}
        size="xl"
        className="transition-transform duration-300 group-hover:scale-105"
      />
      <span className="w-full truncate text-center text-sm font-medium text-gray-700 transition-colors group-hover:text-gray-900 dark:text-gray-300 dark:group-hover:text-white">
        {name}
      </span>
    </Link>
  )
}

export function SubscriptionsPage() {
  const { favoriteCreators } = useUserData()

  if (favoriteCreators.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in">
        <div className="flex size-20 items-center justify-center rounded-2xl bg-gray-50 dark:bg-gray-800">
          <Heart className="size-10 text-gray-300 dark:text-gray-600" />
        </div>
        <h2 className="mt-5 text-lg font-semibold text-gray-900 dark:text-white">
          No favorite creators yet
        </h2>
        <p className="mt-2 max-w-sm text-sm text-gray-400 dark:text-gray-500">
          Visit any channel page and tap the heart to add creators you love. They&apos;ll appear here and in your sidebar.
        </p>
        <Link
          to="/"
          className="mt-6 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
        >
          Browse videos
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Your creators"
        description={`${favoriteCreators.length} creator${favoriteCreators.length === 1 ? '' : 's'} you follow`}
      />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {favoriteCreators.map(({ id, name, avatar }) => (
          <CreatorCard key={id} id={id} name={name} avatar={avatar} />
        ))}
      </div>
    </div>
  )
}
