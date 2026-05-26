import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useParams } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { PageLoader } from '@/components/ui/PageLoader'
import { MiniPlayer } from '@/components/video/MiniPlayer'

const HomePage = lazy(() => import('@/pages/HomePage').then((m) => ({ default: m.HomePage })))
const WatchPage = lazy(() => import('@/pages/WatchPage').then((m) => ({ default: m.WatchPage })))
const ChannelPage = lazy(() => import('@/pages/ChannelPage').then((m) => ({ default: m.ChannelPage })))
const HistoryPage = lazy(() => import('@/pages/HistoryPage').then((m) => ({ default: m.HistoryPage })))
const FavoritesPage = lazy(() => import('@/pages/FavoritesPage').then((m) => ({ default: m.FavoritesPage })))
const WatchLaterPage = lazy(() => import('@/pages/WatchLaterPage').then((m) => ({ default: m.WatchLaterPage })))
const PlaylistsPage = lazy(() => import('@/pages/PlaylistsPage').then((m) => ({ default: m.PlaylistsPage })))
const PlaylistPage = lazy(() => import('@/pages/PlaylistPage').then((m) => ({ default: m.PlaylistPage })))
const ShortsPage = lazy(() => import('@/pages/ShortsPage').then((m) => ({ default: m.ShortsPage })))
const SubscriptionsPage = lazy(() => import('@/pages/SubscriptionsPage').then((m) => ({ default: m.SubscriptionsPage })))
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })))
const DownloadPage = lazy(() => import('@/pages/DownloadPage').then((m) => ({ default: m.DownloadPage })))
const SearchPage = lazy(() => import('@/pages/SearchPage').then((m) => ({ default: m.SearchPage })))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })))
const SignInPage = lazy(() => import('@/pages/SignInPage').then((m) => ({ default: m.SignInPage })))
const NotificationsPage = lazy(() => import('@/pages/NotificationsPage').then((m) => ({ default: m.NotificationsPage })))
const TrendingPage = lazy(() => import('@/pages/TrendingPage').then((m) => ({ default: m.TrendingPage })))
const CategoryPage = lazy(() => import('@/pages/CategoryPage').then((m) => ({ default: m.CategoryPage })))

/** Force ChannelPage remount when param changes — fixes "first click blank" routing bug. */
function ChannelPageWithKey() {
  const { id } = useParams<{ id: string }>()
  return <ChannelPage key={id ?? 'empty'} />
}

function App() {
  return (
    <>
    <Suspense fallback={<PageLoader />}>
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
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="trending" element={<TrendingPage />} />
          <Route path="category/:slug" element={<CategoryPage />} />
          <Route path="channel/:id" element={<ChannelPageWithKey />} />
          <Route path="gaming" element={<Navigate to="/category/gaming" replace />} />
          <Route path="live" element={<Navigate to="/category/live" replace />} />
          <Route path="news" element={<Navigate to="/category/news" replace />} />
          <Route path="premium" element={<Navigate to="/trending" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
    <MiniPlayer />
    </>
  )
}

export default App
