import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useParams, useLocation } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'

/** Force ChannelPage remount when param changes — fixes "first click blank" routing bug. */
function ChannelPageWithKey() {
  const { id } = useParams<{ id: string }>()
  return <ChannelPage key={id ?? 'empty'} />
}

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

function App() {
  return (
    <Suspense>
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
    </Suspense>
  )
}

export default App
