/**
 * DOMPurify wrappers for sanitizing untrusted HTML from external APIs (Piped, YouTube).
 * All dangerouslySetInnerHTML usage must go through one of these functions.
 */

import DOMPurify from 'dompurify'

/** After sanitizing, add target="_blank" rel="noopener noreferrer" to all links */
function addLinkSafety(html: string): string {
  return html.replace(/<a\s/g, '<a target="_blank" rel="noopener noreferrer" ')
}

/**
 * Sanitize video/channel descriptions from Piped API.
 * Allows basic formatting + links; strips scripts, iframes, event handlers.
 */
export function sanitizeDescription(html: string): string {
  if (!html) return ''
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['a', 'b', 'i', 'em', 'strong', 'br', 'p', 'span', 'ul', 'li', 'ol'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
    FORCE_BODY: true,
  })
  return addLinkSafety(clean as string)
}

/**
 * Sanitize comment HTML from YouTube/Piped API.
 */
export function sanitizeComment(html: string): string {
  if (!html) return ''
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['a', 'b', 'i', 'em', 'strong', 'br', 'p', 'span'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    FORCE_BODY: true,
  })
  return addLinkSafety(clean as string)
}

/**
 * Sanitize a plain text string with linkification — escapes HTML entities first,
 * then converts URLs to safe anchor tags. Prevents XSS from user-supplied text.
 */
export function sanitizeLinkifiedText(text: string): string {
  if (!text) return ''
  // Escape HTML entities first to prevent injection via user-supplied text
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
  // Then linkify URLs (they're now safely escaped, no injection possible)
  const linked = escaped.replace(
    /https?:\/\/[^\s<>"']+/g,
    (url) =>
      `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:underline break-all">${url}</a>`,
  )
  return linked
}
