import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { regions, type RegionCode } from '@/data/regions'

const STORAGE_KEY = 'mytube-region'

const isValidRegion = (code: string): code is RegionCode =>
  regions.some((r) => r.code === code)

function loadRegion(): RegionCode {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw && isValidRegion(raw)) return raw
  } catch {}
  return 'US'
}

interface RegionContextValue {
  region: RegionCode
  setRegion: (code: RegionCode) => void
  regionInfo: (typeof regions)[number]
  regions: typeof regions
}

const RegionContext = createContext<RegionContextValue | null>(null)

export function RegionProvider({ children }: { children: React.ReactNode }) {
  const [region, setRegionState] = useState<RegionCode>(loadRegion)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, region)
  }, [region])

  const setRegion = useCallback((code: RegionCode) => {
    setRegionState(code)
  }, [])

  const regionInfo = regions.find((r) => r.code === region) ?? regions[0]

  return (
    <RegionContext.Provider value={{ region, setRegion, regionInfo, regions }}>
      {children}
    </RegionContext.Provider>
  )
}

export function useRegionPreference() {
  const ctx = useContext(RegionContext)
  if (!ctx) {
    throw new Error('useRegionPreference must be used within RegionProvider')
  }
  return ctx
}
