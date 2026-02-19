import { useEffect } from 'react'

export interface SeoHeadProps {
  title?: string
  description?: string
  image?: string
  url?: string
  type?: 'website' | 'video.other'
}

const SITE_NAME = 'myTube'
const DEFAULT_DESCRIPTION = 'Watch videos from your favorite creators. A clean, privacy-focused video experience.'
const BASE_URL = typeof window !== 'undefined' ? window.location.origin : ''

export function SeoHead({
  title,
  description = DEFAULT_DESCRIPTION,
  image,
  url = BASE_URL,
  type = 'website',
}: SeoHeadProps) {
  const fullTitle = title ? `${title} — ${SITE_NAME}` : SITE_NAME
  const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`
  const fullImage = image?.startsWith('http') ? image : image ? `${BASE_URL}${image}` : undefined

  useEffect(() => {
    document.title = fullTitle

    const setMeta = (name: string, content: string, attr: 'name' | 'property' = 'name') => {
      let el = document.querySelector(`meta[${attr}="${name}"]`)
      if (!el) {
        el = document.createElement('meta')
        el.setAttribute(attr, name)
        document.head.appendChild(el)
      }
      el.setAttribute('content', content)
    }

    setMeta('description', description)

    // Open Graph
    setMeta('og:title', fullTitle, 'property')
    setMeta('og:description', description, 'property')
    setMeta('og:type', type, 'property')
    setMeta('og:url', fullUrl, 'property')
    setMeta('og:site_name', SITE_NAME, 'property')
    if (fullImage) setMeta('og:image', fullImage, 'property')

    // Twitter
    setMeta('twitter:card', fullImage ? 'summary_large_image' : 'summary')
    setMeta('twitter:title', fullTitle)
    setMeta('twitter:description', description)
    if (fullImage) setMeta('twitter:image', fullImage)
  }, [fullTitle, description, fullUrl, fullImage, type])

  return null
}
