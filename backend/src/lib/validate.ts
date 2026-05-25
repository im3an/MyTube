/**
 * Zod v4-based request validation helpers.
 * Throws BadRequestError with a human-readable message on validation failure.
 */

import { z, type ZodType } from 'zod'
import { BadRequestError } from '../utils/errors.js'

export { z }

/**
 * Validate an unknown body against a Zod schema.
 * Throws BadRequestError (HTTP 400) if validation fails.
 */
export function parseBody<T>(schema: ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body)
  if (!result.success) {
    const issue = result.error.issues[0]
    const path = issue?.path?.length > 0 ? `${issue.path.join('.')}: ` : ''
    const msg = issue ? `${path}${issue.message}` : 'Invalid request body'
    throw new BadRequestError(msg)
  }
  return result.data
}

// ─── Reusable schemas ──────────────────────────────────────────

/** YouTube-style username: 3–32 alphanumeric + . _ - */
export const usernameSchema = z
  .string()
  .min(3, 'username must be at least 3 characters')
  .max(32, 'username must be at most 32 characters')
  .regex(/^[A-Za-z0-9._-]+$/, 'username may only contain letters, numbers, dots, hyphens and underscores')

/** Display name: up to 50 printable chars */
export const displayNameSchema = z
  .string()
  .max(50, 'displayName must be at most 50 characters')
  .optional()

/** Avatar URL: https URL, max 500 chars, or empty/relative path */
export const avatarUrlSchema = z
  .string()
  .max(500, 'avatarUrl is too long')
  .refine(
    (v) => v === '' || v.startsWith('https://') || v.startsWith('/'),
    'avatarUrl must be a secure URL or relative path',
  )
  .optional()
