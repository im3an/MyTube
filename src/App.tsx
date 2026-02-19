import { Routes, Route, Navigate, useParams, useLocation } from 'react-router-dom'

/** Force ChannelPage remount when param changes — fixes "first click blank" routing bug. */
function ChannelPageWithKey() {
  const { id } = useParams<{ id: string }>()
  return <ChannelPage key={id ?? 'empty'} />
}
import { AppLayout } from '@/components/layout/AppLayout'

function RedirectCategoryToSearch() {
  const { slug } = useParams<{ slug: string }>()
  return <Navigate to={slug ? `/?category=${slug}` : '/'} replace />
}

function RedirectExploreToCategory() {
  const location = useLocation()
  const path = location.pathname.replace(/^\//, '')
  const categoryMap: Record<string, string> = {
    premium: 'trending',
    gaming: 'gaming',
    live: 'live',
    news: 'news',
  }
  const category = categoryMap[path] ?? 'all'
  return <Navigate to={`/?category=${category}`} replace />
}
import { HomePage } from '@/pages/HomePage'
import { WatchPage } from '@/pages/WatchPage'
import { ChannelPage } from '@/pages/ChannelPage'
import { HistoryPage } from '@/pages/HistoryPage'
import { FavoritesPage } from '@/pages/FavoritesPage'
import { WatchLaterPage } from '@/pages/WatchLaterPage'
import { PlaylistsPage } from '@/pages/PlaylistsPage'
import { PlaylistPage } from '@/pages/PlaylistPage'
import { ShortsPage } from '@/pages/ShortsPage'
import { SubscriptionsPage } from '@/pages/SubscriptionsPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { DownloadPage } from '@/pages/DownloadPage'
import { SearchPage } from '@/pages/SearchPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { SignInPage } from '@/pages/SignInPage'

function App() {
  return (
    <Routes>
      <Route path="/signin" element={<SignInPage />} />
      <Route path="/" element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="watch/:id" element={<WatchPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="favorites" element={<FavoritesPage />} />
        <Route path="watch-later" element={<WatchLaterPage />} />
        <Route path="playlists" element={<PlaylistsPage />} />
        <Route path="playlist/:id" element={<PlaylistPage />} />
        <Route path="shorts" element={<ShortsPage />} />
        <Route path="subscriptions" element={<SubscriptionsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="download" element={<DownloadPage />} />
        <Route path="category/:slug" element={<RedirectCategoryToSearch />} />
        <Route path="channel/:id" element={<ChannelPageWithKey />} />
        <Route path="premium" element={<RedirectExploreToCategory />} />
        <Route path="gaming" element={<RedirectExploreToCategory />} />
        <Route path="live" element={<RedirectExploreToCategory />} />
        <Route path="news" element={<RedirectExploreToCategory />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

export default App
