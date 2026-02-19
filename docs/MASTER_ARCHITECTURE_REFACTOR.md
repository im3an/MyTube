# 🧠 MyTube Master Architecture Refactor

**Purpose:** System-level refactor instructions to fix current bugs and prevent future instability. Paste this into Cursor, Copilot, or ChatGPT when refactoring the MyTube app.

**Current stack:** React + Vite + TypeScript, Piped API backend, no React Query (useState/useEffect hooks).

---

## Current Architecture (Reference)

| Layer | Files | Current State |
|-------|-------|---------------|
| API | `src/api/youtube.ts` | Direct fetch to `/api/piped/*`, backend fallback when `VITE_USE_BACKEND=1` |
| Piped proxy | `vite.config.ts` (pipedApiProxy) | Multi-instance failover at dev-server level only |
| Channel resolution | `src/api/youtube.ts`, `src/hooks/useResolvedChannelId.ts` | Scattered: channelCache, channelIdCache, avatarCache |
| Data hooks | `src/hooks/useYouTube.ts` | useState + useEffect, no query key/deduplication |
| Channel page | `src/pages/ChannelPage.tsx` | useChannel, redirect on resolve, `key={id}` in App.tsx |
| Avatars | `src/hooks/useChannelAvatar.ts` | isMock() for DiceBear, multiple caches |
| Routing | `src/App.tsx` | ChannelPageWithKey uses `key={id}` |

---

## Problems to Fix

- Blank channel page on first click
- Double-click required for data to appear
- Handle (@username) resolution failures
- 500 errors from Piped
- Avatar inconsistencies
- Duplicate API calls (getChannel called from useChannel, useChannelAvatar, useResolvedChannelId)
- Missing loading states in some flows
- Route param changes not always triggering refetch
- Over-fetching streams via `useVideosByIds` (getVideo for full stream detail)
- No central identity system
- No frontend retry/instance fallback (proxy does it, but frontend fetch has no retry)
- No request deduplication beyond ad-hoc Maps
- Fragile UI state transitions

---

# 🔥 CORE PRINCIPLES (MUST FOLLOW)

1. **Single Source of Truth** — All channel identity resolution goes through one canonical resolver.
2. **No Direct API Calls in Components** — Components use only hooks or service functions.
3. **Never Trust Handles** — Handles must always resolve to canonical UC IDs before API/routing.
4. **Never Render Null Pages** — Every page: Loading → Error → Success. Never blank.
5. **All Async Operations Cached** — No duplicate network calls for the same logical request.
6. **Param-Driven Queries** — Query keys (or equivalent) include dynamic params; no static keys.
7. **Retry Strategy** — All API calls have fallback or retry logic.
8. **Lazy-Load Streams** — Never fetch full stream metadata on homepage; only on WatchPage.

---

# STEP 1 — Robust Piped Client

**Create:** `src/api/pipedClient.ts`

```
const INSTANCES = [
  "https://piped.video",
  "https://pipedapi.kavin.rocks",
  "https://pipedapi.tokhmi.xyz",
  "https://pipedapi.moomoo.me",
]
```

- All Piped requests go through this client.
- Try instances sequentially on 500/timeout.
- Timeout per request (e.g. 10s).
- Log failed instance for debugging.
- Return first successful response.
- **No component may call `fetch` directly for Piped.** Use pipedClient.

**Integration:** Refactor `src/api/youtube.ts` to use `pipedClient.request(path)` instead of `fetch(\`${API_BASE}${path}\`)`. Keep `USE_BACKEND` branch; when backend is used, pipedClient is bypassed.

---

# STEP 2 — Canonical Channel Resolution System

**Create:** `src/lib/channelIdentity.ts`

```
resolveChannelIdentity(input: string): Promise<CanonicalChannel | null>
```

Rules:
- If starts with `UC` and matches `^UC[\w-]{22}$` → fetch via `/channel/:id`.
- If starts with `@` or is non-canonical → use `/search?q=handle&filter=channels`, extract UC ID from first channel result.
- Cache in `Map<string, Promise<CanonicalChannel | null>>` (promise cache for dedup).
- Never call `/channel/@handle` or `/user/:name`.
- Never route with handle. Always route with UC ID.

```ts
type CanonicalChannel = {
  id: string      // UC ID only
  name: string
  avatar: string | null
  handle?: string
}
```

**Remove:** Scattered resolution from `getChannel`, `useResolvedChannelId`, `channelIdCache`, `channelIdCache` in useResolvedChannelId. All resolution flows through `resolveChannelIdentity`.

**Update:** `getChannel(channelId)` accepts only UC ID. Caller must resolve first via `resolveChannelIdentity` when input is handle.

---

# STEP 3 — React Query (Recommended) or Query Correctness

**Option A — Add React Query**

- Install `@tanstack/react-query`.
- All data fetching via `useQuery` / `useInfiniteQuery`.
- Query keys: `["channel", channelId]`, `["video", videoId]`, `["search", query, region]`, etc.
- `enabled: !!channelId` (or equivalent) for param-driven queries.
- No empty dependency arrays; no static query keys.

**Option B — Keep Current Hooks but Fix Behavior**

- Ensure all hooks accept params and refetch when params change.
- Use in-memory promise cache for identical in-flight requests (e.g. `channelCache` already caches by promise; extend to avoid duplicate `getChannel` from useChannel + useChannelAvatar).
- `useChannel(channelId)` must refetch when `channelId` changes; `ChannelPage` must remount or key on `channelId`.

---

# STEP 4 — Route Stability

**Current:** `ChannelPageWithKey` uses `key={id}`. The `id` can be `@handle` or UC ID.

**Fix:**
- Resolve handle → UC ID **before** rendering ChannelPage, or ensure ChannelPage remounts when `id` (or resolved UC ID) changes.
- Ensure `key` changes when navigating from Channel A to Channel B (including A=@handle, B=UCxxxx).
- Use `key={location.pathname}` or `key={channelId}` where `channelId` is the param. If using resolved ID, key on resolved ID once available.

**Explicit remount on param change:**

```tsx
<Route path="/channel/:channelId" element={<ChannelPage key={location.pathname} />} />
```

Or inside ChannelPage:

```tsx
const { channelId } = useParams()
return <ChannelContent key={channelId} channelId={channelId} />
```

---

# STEP 5 — Page State Structure

Every page must follow:

```tsx
if (isLoading) return <LoadingSkeleton />
if (error) return <ErrorState onRetry={refetch} />
if (!data) return <LoadingSkeleton />
return <Content data={data} />
```

Never return `null`. ChannelPage already has Loading/Error/!channel; ensure WatchPage, SearchPage, HomePage follow the same pattern.

---

# STEP 6 — Avatar System Fix

- **Data layer never injects DiceBear.** DiceBear is UI-only fallback.
- Fallback order: (1) Resolved channel avatar, (2) API thumbnail, (3) DiceBear placeholder in Avatar component.
- `useChannelAvatar` must not let mock override real avatar. Keep `isMock()` and reject mock URLs as source of truth.
- Single cache: use `resolveChannelIdentity` or `getChannel` (UC only) as source. `avatarCache` should key by UC ID and populate from canonical resolution.

---

# STEP 7 — Stream Optimization

- **Homepage:** Metadata only (thumbnails, title, author). No `getVideo` for full stream detail.
- **WatchPage:** Fetch `/streams/:id` only when user navigates to watch.
- **useVideosByIds** in `useYouTube.ts` currently calls `getVideo` for up to 8 IDs — this fetches full stream data. Replace with a lightweight metadata endpoint if available, or remove bulk fetch and show thumbnails from search/trending only.
- Lazy-load stream URL; abort previous fetch if user navigates away (AbortController).
- `useCobaltStreamUrl` is fine as fallback when Piped streams fail.

---

# STEP 8 — Error Resilience

- All Piped calls: handle 500, timeout, network error.
- Retry with next instance (pipedClient responsibility).
- Show user-friendly fallback UI; never crash the page.
- Backend already has circuit breaker; frontend pipedClient should have retry/fallback when not using backend.

---

# STEP 9 — Request Deduplication

- Use React Query caching if adopted.
- Otherwise: in-memory promise cache per logical key (e.g. `channelCache` keyed by input, `resolveChannelIdentity` promise cache).
- Prevent duplicate `getChannel(channelId)` when `useChannel` and `useChannelAvatar` both need it — single resolution path.

---

# STEP 10 — Future-Proofing

- Central API layer: `src/api/youtube.ts` as facade; all Piped access via `pipedClient`.
- Structured error logging (e.g. `logApiError(scope, error)`).
- Timeout and AbortController on all fetches.
- Strict TypeScript types; consider Zod for API response validation.
- Rate-limit protection (throttle identical requests).
- Instance health rotation (vite proxy already does discovery; pipedClient can do same when used stand-alone).

---

# Target Architecture

```
UI Layer (pages, components)
    ↓
Hooks Layer (useChannel, useVideo, useSearch, ...)
    ↓
Service Layer (youtube.ts, channelIdentity.ts)
    ↓
Piped Client (pipedClient.ts — fallback + retry)
    ↓
Piped API (or Backend when VITE_USE_BACKEND=1)
```

No direct fetches from components. No handle-based routing. Single channel resolution path.

---

# File Change Summary

| Action | File | Change |
|--------|------|--------|
| Create | `src/api/pipedClient.ts` | Multi-instance fetch with retry |
| Create | `src/lib/channelIdentity.ts` | resolveChannelIdentity, CanonicalChannel |
| Refactor | `src/api/youtube.ts` | Use pipedClient; getChannel accepts UC only |
| Refactor | `src/hooks/useResolvedChannelId.ts` | Use channelIdentity, remove duplicate cache |
| Refactor | `src/hooks/useChannelAvatar.ts` | Source from channelIdentity/getChannel |
| Refactor | `src/hooks/useYouTube.ts` | useChannel, useVideo — ensure param-driven refetch |
| Refactor | `src/pages/ChannelPage.tsx` | Resolve before render or key on resolved ID |
| Refactor | `src/App.tsx` | Route key = pathname or channelId |
| Optional | Add React Query | Migrate hooks to useQuery/useInfiniteQuery |

---

# Extra Rule (Ongoing)

Every new feature must:
- Use param-driven queries
- Use centralized data fetching (hooks / services)
- Implement Loading + Error + Success states
- Prefer cache-first resolution
- Avoid direct API calls from components

---

*Use this document as the single source of truth for MyTube architecture refactors.*
