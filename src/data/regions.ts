/** Region/country options for trending content (ISO 3166-1 alpha-2) */
/** Language keyword to append to search for localized results (empty = default English) */
export const regions = [
  { code: 'US', name: 'United States', flag: '🇺🇸', searchLang: '' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', searchLang: '' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', searchLang: '' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', searchLang: '' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', searchLang: 'deutsch' },
  { code: 'FR', name: 'France', flag: '🇫🇷', searchLang: 'français' },
  { code: 'IN', name: 'India', flag: '🇮🇳', searchLang: 'hindi' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵', searchLang: '日本語' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷', searchLang: '한국어' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷', searchLang: 'português' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽', searchLang: 'español' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸', searchLang: 'español' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹', searchLang: 'italiano' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱', searchLang: 'nederlands' },
  { code: 'RU', name: 'Russia', flag: '🇷🇺', searchLang: 'русский' },
  { code: 'TR', name: 'Turkey', flag: '🇹🇷', searchLang: 'türkçe' },
  { code: 'PL', name: 'Poland', flag: '🇵🇱', searchLang: 'polski' },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪', searchLang: 'svenska' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷', searchLang: 'español' },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦', searchLang: 'عربي' },
  { code: 'AE', name: 'UAE', flag: '🇦🇪', searchLang: 'عربي' },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬', searchLang: 'عربي' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬', searchLang: '' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦', searchLang: '' },
] as const

export type RegionCode = (typeof regions)[number]['code']

/** Returns the language keyword to append to search for localized results. */
export function getSearchLangForRegion(region: RegionCode): string {
  return regions.find((r) => r.code === region)?.searchLang ?? ''
}
