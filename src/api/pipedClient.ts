/**
 * Piped API client — timeout, AbortController, retry on 502.
 * All Piped fetch calls go through this. Vite proxy handles instance fallback in dev.
 * @see docs/MASTER_ARCHITECTURE_REFACTOR.md
 */

const API_BASE = '/api/piped'
const DEFAULT_TIMEOUT_MS = 10_000

const PIPED_HEADERS = {
  Accept: 'application/json',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; rv:131.0) Gecko/20100101 Firefox/131.0',
}

export interface PipedClientOptions {
  signal?: AbortSignal
  timeoutMs?: number
}

/**
 * Fetch from Piped API with timeout and optional abort.
 * On 502 (all instances failed), retries once after short delay.
 */
export async function pipedFetch(
  path: string,
  options: PipedClientOptions = {}
): Promise<Response> {
  const { signal, timeoutMs = DEFAULT_TIMEOUT_MS } = options
  const url = path.startsWith('http') ? path : `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`

  const controller = new AbortController()
  const tid = setTimeout(() => controller.abort(), timeoutMs)
  const abortSignal: AbortSignal =
    signal && typeof AbortSignal.any === 'function'
      ? AbortSignal.any([signal, controller.signal])
      : controller.signal

  try {
    let res = await fetch(url, { signal: abortSignal, headers: PIPED_HEADERS })

    if (res.status === 502 && !signal?.aborted) {
      clearTimeout(tid)
      await new Promise((r) => setTimeout(r, 500))
      const retryController = new AbortController()
      const retryTid = setTimeout(() => retryController.abort(), timeoutMs)
      try {
        return await fetch(url, { signal: retryController.signal, headers: PIPED_HEADERS })
      } finally {
        clearTimeout(retryTid)
      }
    }

    return res
  } finally {
    clearTimeout(tid)
  }
}

/** JSON fetch with pipedFetch. Throws on !res.ok unless throwOnError is false. */
export async function pipedJson<T>(
  path: string,
  options: PipedClientOptions & { throwOnError?: boolean } = {}
): Promise<T> {
  const { throwOnError = true, ...opts } = options
  const res = await pipedFetch(path, opts)
  const data = await res.json()
  if (!res.ok && throwOnError) {
    throw new Error(typeof data?.error === 'string' ? data.error : `Piped API error ${res.status}`)
  }
  return data as T
}
