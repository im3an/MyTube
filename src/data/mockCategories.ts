import type { ComponentType, SVGProps } from 'react'
import {
  Grid01,
  TrendUp01,
  MusicNote01,
  GamingPad01,
  Announcement02,
  Trophy01,
  Stars02,
  FaceHappy,
  GraduationHat01,
  Atom01,
  Clapperboard,
  Tool01,
  Signal01,
  Podcast,
  Compass01,
  Palette,
  Headphones01,
} from '@untitledui/icons'

export interface Category {
  id: string
  label: string
  slug: string
  query: string | null
  description: string
  keywords: string[]
  icon: ComponentType<SVGProps<SVGSVGElement>>
}

export const categories: readonly Category[] = [
  { id: 'all', label: 'All', slug: 'all', query: null, description: 'Trending videos from around the world', keywords: ['trending', 'viral', 'popular'], icon: Grid01 },
  { id: 'trending', label: 'Trending', slug: 'trending', query: 'trending', description: 'What\'s hot right now', keywords: ['trending', 'viral', 'hot'], icon: TrendUp01 },
  { id: 'music', label: 'Music', slug: 'music', query: 'music', description: 'Music videos, songs, and performances', keywords: ['music', 'songs', 'music videos'], icon: MusicNote01 },
  { id: 'gaming', label: 'Gaming', slug: 'gaming', query: 'gaming', description: 'Gaming content, Let\'s Plays, and esports', keywords: ['gaming', 'video games', 'esports'], icon: GamingPad01 },
  { id: 'news', label: 'News', slug: 'news', query: 'news', description: 'News and current events', keywords: ['news', 'current events'], icon: Announcement02 },
  { id: 'sports', label: 'Sports', slug: 'sports', query: 'sports highlights', description: 'Sports highlights and analysis', keywords: ['sports', 'highlights', 'athletics'], icon: Trophy01 },
  { id: 'entertainment', label: 'Entertainment', slug: 'entertainment', query: 'entertainment', description: 'Entertainment and pop culture', keywords: ['entertainment', 'pop culture'], icon: Stars02 },
  { id: 'podcasts', label: 'Podcasts', slug: 'podcasts', query: 'podcast', description: 'Podcasts and talk shows', keywords: ['podcast', 'talk show', 'interview'], icon: Podcast },
  { id: 'comedy', label: 'Comedy', slug: 'comedy', query: 'comedy', description: 'Comedy sketches and stand-up', keywords: ['comedy', 'funny', 'humor'], icon: FaceHappy },
  { id: 'education', label: 'Education', slug: 'education', query: 'education', description: 'Educational videos and tutorials', keywords: ['education', 'learning', 'tutorials'], icon: GraduationHat01 },
  { id: 'science', label: 'Science & Tech', slug: 'science', query: 'science technology', description: 'Science and technology content', keywords: ['science', 'technology', 'tech'], icon: Atom01 },
  { id: 'film', label: 'Film & Animation', slug: 'film', query: 'film animation trailer', description: 'Movies, animation, and trailers', keywords: ['movies', 'animation', 'trailers'], icon: Clapperboard },
  { id: 'howto', label: 'How-to & DIY', slug: 'howto', query: 'how to diy tutorial', description: 'How-to guides and DIY projects', keywords: ['how to', 'diy', 'tutorial'], icon: Tool01 },
  { id: 'travel', label: 'Travel', slug: 'travel', query: 'travel vlog', description: 'Travel vlogs and destination guides', keywords: ['travel', 'vlog', 'adventure'], icon: Compass01 },
  { id: 'fashion', label: 'Fashion & Beauty', slug: 'fashion', query: 'fashion beauty', description: 'Fashion trends and beauty tips', keywords: ['fashion', 'beauty', 'style'], icon: Palette },
  { id: 'lofi', label: 'Lo-Fi', slug: 'lofi', query: 'lofi chill beats', description: 'Chill beats and ambient music', keywords: ['lofi', 'chill', 'ambient', 'beats'], icon: Headphones01 },
  { id: 'live', label: 'Live', slug: 'live', query: 'live stream', description: 'Live streams and broadcasts', keywords: ['live', 'streaming'], icon: Signal01 },
] as const

export type CategorySlug = (typeof categories)[number]['slug']
