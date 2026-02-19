export interface Video {
  id: string
  title: string
  channelName: string
  channelAvatar: string
  views: string
  uploadedAt: string
  thumbnail: string
  category: string
  duration?: string
}

const VIDEO_ID = 'pHCLGs4GGvQ'

export const mockVideos: Video[] = [
  {
    id: VIDEO_ID,
    title: 'Amazing Showcase - Must Watch Content',
    channelName: 'Tech Channel',
    channelAvatar: '',
    views: '1.2M',
    uploadedAt: '2 weeks ago',
    thumbnail: `https://img.youtube.com/vi/${VIDEO_ID}/maxresdefault.jpg`,
    category: 'tech',
    duration: '10:24',
  },
  {
    id: VIDEO_ID,
    title: 'Epic Gaming Moments Compilation',
    channelName: 'Gamer Pro',
    channelAvatar: '',
    views: '856K',
    uploadedAt: '1 month ago',
    thumbnail: `https://img.youtube.com/vi/${VIDEO_ID}/hqdefault.jpg`,
    category: 'gaming',
    duration: '15:32',
  },
  {
    id: VIDEO_ID,
    title: 'Chill Music Mix - Relaxing Vibes',
    channelName: 'Music Lounge',
    channelAvatar: '',
    views: '2.4M',
    uploadedAt: '3 days ago',
    thumbnail: `https://img.youtube.com/vi/${VIDEO_ID}/maxresdefault.jpg`,
    category: 'music',
    duration: '1:24:00',
  },
  {
    id: VIDEO_ID,
    title: 'Sports Highlights of the Week',
    channelName: 'Sports Central',
    channelAvatar: '',
    views: '432K',
    uploadedAt: '5 days ago',
    thumbnail: `https://img.youtube.com/vi/${VIDEO_ID}/hqdefault.jpg`,
    category: 'sports',
    duration: '8:15',
  },
  {
    id: VIDEO_ID,
    title: 'Breaking News Analysis',
    channelName: 'News Daily',
    channelAvatar: '',
    views: '189K',
    uploadedAt: '1 day ago',
    thumbnail: `https://img.youtube.com/vi/${VIDEO_ID}/maxresdefault.jpg`,
    category: 'news',
    duration: '12:45',
  },
  {
    id: VIDEO_ID,
    title: 'Learn Programming - Full Tutorial',
    channelName: 'Code Academy',
    channelAvatar: '',
    views: '567K',
    uploadedAt: '2 months ago',
    thumbnail: `https://img.youtube.com/vi/${VIDEO_ID}/hqdefault.jpg`,
    category: 'education',
    duration: '45:00',
  },
  {
    id: VIDEO_ID,
    title: 'Funny Clips That Made Us Laugh',
    channelName: 'Entertainment Hub',
    channelAvatar: '',
    views: '3.1M',
    uploadedAt: '1 week ago',
    thumbnail: `https://img.youtube.com/vi/${VIDEO_ID}/maxresdefault.jpg`,
    category: 'entertainment',
    duration: '22:10',
  },
  {
    id: VIDEO_ID,
    title: 'New Phone Review 2025',
    channelName: 'Tech Reviewer',
    channelAvatar: '',
    views: '923K',
    uploadedAt: '4 days ago',
    thumbnail: `https://img.youtube.com/vi/${VIDEO_ID}/hqdefault.jpg`,
    category: 'tech',
    duration: '18:33',
  },
  {
    id: VIDEO_ID,
    title: 'Indie Game Soundtrack',
    channelName: 'Game Music',
    channelAvatar: '',
    views: '678K',
    uploadedAt: '3 weeks ago',
    thumbnail: `https://img.youtube.com/vi/${VIDEO_ID}/maxresdefault.jpg`,
    category: 'music',
    duration: '52:00',
  },
  {
    id: VIDEO_ID,
    title: 'Match Highlights - Full Game',
    channelName: 'Sports Fan',
    channelAvatar: '',
    views: '245K',
    uploadedAt: '6 days ago',
    thumbnail: `https://img.youtube.com/vi/${VIDEO_ID}/hqdefault.jpg`,
    category: 'sports',
    duration: '28:45',
  },
  {
    id: VIDEO_ID,
    title: 'How to Master Any Skill',
    channelName: 'Learning Path',
    channelAvatar: '',
    views: '412K',
    uploadedAt: '1 month ago',
    thumbnail: `https://img.youtube.com/vi/${VIDEO_ID}/maxresdefault.jpg`,
    category: 'education',
    duration: '35:20',
  },
  {
    id: VIDEO_ID,
    title: 'Comedy Special Highlights',
    channelName: 'Laugh Factory',
    channelAvatar: '',
    views: '1.8M',
    uploadedAt: '2 weeks ago',
    thumbnail: `https://img.youtube.com/vi/${VIDEO_ID}/hqdefault.jpg`,
    category: 'entertainment',
    duration: '14:22',
  },
]

export function getVideoById(id: string): Video | undefined {
  return mockVideos.find((v) => v.id === id) ?? mockVideos[0]
}

export function getVideosByCategory(category: string): Video[] {
  if (category === 'all' || !category) return mockVideos
  return mockVideos.filter((v) => v.category === category)
}
