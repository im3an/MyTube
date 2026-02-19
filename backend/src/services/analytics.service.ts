/**
 * Analytics: views, likes. Fire-and-forget writes; invalidate video L1 cache on write.
 */

import * as analyticsQueries from '../db/queries/analytics.js'
import { invalidateVideo } from '../cache/memory.js'

export async function incrementViewCount(videoId: string): Promise<void> {
  await analyticsQueries.incrementViews(videoId)
  invalidateVideo(videoId)
}

export async function incrementLikeCount(videoId: string): Promise<void> {
  await analyticsQueries.incrementLikes(videoId)
  invalidateVideo(videoId)
}

export async function getAnalytics(videoId: string): Promise<{ views: number; likes: number } | null> {
  return analyticsQueries.getAnalytics(videoId)
}
