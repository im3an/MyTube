/**
 * 2026-style recommendation algorithm: satisfaction score combining
 * personalization, search intent, and engagement with diversity constraints.
 */

import type { SearchHistoryEntry } from '@/hooks/useUserData'
import type { UserData } from '@/hooks/useUserData'
import { categories } from '@/data/mockCategories'

export interface ScoredVideo {
  id: string
  channelId: string
  title: string
  description?: string
  viewCount: number
  lengthSeconds: number
  published: number
  [key: string]: unknown
}

export interface DiversityConstraints {
  maxConsecutiveSameChannel?: number
  maxChannelDensity?: number
  windowSize?: number
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

/** Compute channel watch counts from history + historyChannelMap */
export function getChannelWatchCount(
  history: UserData['history'],
  historyChannelMap: Map<string, string> // videoId -> channelId
): Map<string, number> {
  const counts = new Map<string, number>()
  for (const { videoId } of history.slice(0, 50)) {
    const ch = historyChannelMap.get(videoId)
    if (ch) counts.set(ch, (counts.get(ch) ?? 0) + 1)
  }
  return counts
}

/** Average retention (playbackPosition/lengthSeconds) for same-channel videos in history */
function watchTimeRetentionScore(
  channelId: string,
  userData: UserData,
  historyChannelMap: Map<string, string>,
  videoLengthMap: Map<string, number>
): number {
  let sum = 0
  let n = 0
  for (const { videoId } of userData.history.slice(0, 50)) {
    if (historyChannelMap.get(videoId) !== channelId) continue
    const pos = userData.playbackPositions[videoId] ?? userData.watchTime?.[videoId] ?? 0
    const len = videoLengthMap.get(videoId) ?? 300
    if (len > 0 && pos > 0) {
      sum += Math.min(1, pos / len)
      n++
    }
  }
  return n === 0 ? 0 : Math.min(1, sum / n)
}

/** Recency: channels watched in last 7 days get boost */
function recencyScore(channelId: string, userData: UserData, historyChannelMap: Map<string, string>): number {
  const now = Date.now()
  let recentCount = 0
  for (const { videoId, watchedAt } of userData.history.slice(0, 50)) {
    if (historyChannelMap.get(videoId) !== channelId) continue
    const t = new Date(watchedAt).getTime()
    if (now - t < SEVEN_DAYS_MS) recentCount++
  }
  return Math.min(1, recentCount / 3)
}

/**
 * Personalization score (0–1).
 * Uses channelWatchCount and historyChannelMap - caller must compute these from
 * history + fetched history videos when available.
 */
export function computePersonalizationScore(
  video: ScoredVideo,
  userData: UserData,
  channelWatchCount: Map<string, number>,
  historyChannelMap: Map<string, string>,
  videoLengthMap?: Map<string, number>
): number {
  const channelId = video.channelId
  if (!channelId) return 0

  const affinity = (() => {
    const count = channelWatchCount.get(channelId) ?? 0
    return Math.min(1, count / 10)
  })()

  const favoriteCreator = userData.favoriteCreators.some((c) => c.id === channelId) ? 1 : 0

  const retention = watchTimeRetentionScore(
    channelId,
    userData,
    historyChannelMap,
    videoLengthMap ?? new Map()
  )

  const recency = recencyScore(channelId, userData, historyChannelMap)

  return 0.4 * affinity + 0.3 * favoriteCreator + 0.2 * retention + 0.1 * recency
}

/** Tokenize for matching (lowercase, split on non-alphanumeric) */
function tokenize(s: string): Set<string> {
  return new Set(s.toLowerCase().replace(/\s+/g, ' ').split(/\W+/).filter(Boolean))
}

/** Query-title match: token overlap (Jaccard-like) */
function queryTitleScore(queries: string[], title: string): number {
  if (queries.length === 0) return 0
  const titleTokens = tokenize(title)
  let best = 0
  for (const q of queries.slice(0, 10)) {
    const qTokens = tokenize(q)
    if (qTokens.size === 0) continue
    let overlap = 0
    for (const t of qTokens) {
      if (titleTokens.has(t)) overlap++
    }
    const jaccard = overlap / (qTokens.size + titleTokens.size - overlap || 1)
    best = Math.max(best, jaccard)
  }
  return Math.min(1, best * 2) // scale up partial matches
}

/** Category match: if user searched "gaming", boost gaming category videos */
function categoryMatchScore(queries: string[], video: ScoredVideo): number {
  const titleLower = (video.title + ' ' + (video.description ?? '')).toLowerCase()
  for (const cat of categories) {
    if (cat.slug === 'all') continue
    const keywords = cat.keywords
    const queryMatches = queries.some((q) =>
      keywords.some((kw) => q.toLowerCase().includes(kw) || kw.includes(q.toLowerCase()))
    )
    if (!queryMatches) continue
    const titleMatches = keywords.some((kw) => titleLower.includes(kw))
    if (titleMatches) return 1
  }
  return 0
}

/**
 * Search intent score (0–1).
 */
export function computeIntentScore(
  video: ScoredVideo,
  searchHistory: SearchHistoryEntry[]
): number {
  const queries = searchHistory.map((e) => e.query)
  if (queries.length === 0) return 0

  const titleScore = queryTitleScore(queries, video.title)
  const descScore = video.description
    ? queryTitleScore(queries, video.description)
    : 0
  const catScore = categoryMatchScore(queries, video)

  return 0.6 * titleScore + 0.2 * descScore + 0.2 * catScore
}

/**
 * Engagement score (0–1).
 */
export function computeEngagementScore(video: ScoredVideo, userData: UserData): number {
  const viewScore = Math.min(1, Math.log10((video.viewCount ?? 0) + 1) / 8)
  const published = video.published ?? 0
  const publishedMs = published * 1000
  const recencyScore = Date.now() - publishedMs < THIRTY_DAYS_MS ? 0.5 + 0.5 * (1 - (Date.now() - publishedMs) / THIRTY_DAYS_MS) : 0.5

  let retentionScore = 0
  const pos = userData.playbackPositions[video.id] ?? userData.watchTime?.[video.id]
  const len = video.lengthSeconds || 1
  if (pos != null && pos > 0) {
    retentionScore = Math.min(1, pos / len)
  }

  return 0.5 * viewScore + 0.3 * retentionScore + 0.2 * Math.min(1, recencyScore)
}

/**
 * Apply diversity: limit consecutive same channel.
 */
export function applyDiversity<T extends { channelId: string }>(
  candidates: T[],
  constraints: DiversityConstraints = {}
): T[] {
  const maxConsecutive = constraints.maxConsecutiveSameChannel ?? 2
  const result: T[] = []
  const remaining = [...candidates]

  while (remaining.length > 0) {
    const ch = remaining[0].channelId
    const recent = result.slice(-maxConsecutive)
    const consecutiveSame = recent.filter((r) => r.channelId === ch).length

    if (consecutiveSame >= maxConsecutive) {
      const otherIdx = remaining.findIndex((c) => c.channelId !== ch)
      if (otherIdx < 0) {
        result.push(remaining.shift()!)
      } else {
        const [other] = remaining.splice(otherIdx, 1)
        result.push(other)
      }
    } else {
      result.push(remaining.shift()!)
    }
  }

  return result
}

export interface RankOptions {
  channelWatchCount?: Map<string, number>
  historyChannelMap?: Map<string, string>
  videoLengthMap?: Map<string, number>
  diversity?: DiversityConstraints
}

/**
 * Rank videos by satisfaction score with diversity.
 */
export function rankVideos<T extends ScoredVideo>(
  candidates: T[],
  userData: UserData,
  options: RankOptions = {}
): T[] {
  const channelWatchCount = options.channelWatchCount ?? new Map<string, number>()
  const historyChannelMap = options.historyChannelMap ?? new Map<string, string>()
  const videoLengthMap = options.videoLengthMap ?? new Map<string, number>()
  const diversity = options.diversity ?? {}

  const hasHistory = userData.history.length > 0
  const [alpha, beta, gamma] = hasHistory ? [0.5, 0.25, 0.25] : [0, 0.3, 0.7]

  const scored = candidates.map((v) => {
    const p = computePersonalizationScore(v, userData, channelWatchCount, historyChannelMap, videoLengthMap)
    const i = computeIntentScore(v, userData.searchHistory ?? [])
    const e = computeEngagementScore(v, userData)
    const score = alpha * p + beta * i + gamma * e
    return { video: v, score }
  })

  scored.sort((a, b) => b.score - a.score)
  const ordered = scored.map((s) => s.video)
  return applyDiversity(ordered, {
    maxConsecutiveSameChannel: 2,
    maxChannelDensity: 0.4,
    windowSize: 20,
    ...diversity,
  }) as T[]
}
