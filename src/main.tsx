import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { RegionProvider } from '@/components/providers/RegionProvider'
import { AuthProvider } from '@/hooks/useAuth'
import { MiniPlayerProvider } from '@/components/providers/MiniPlayerContext'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import App from './App'
import './styles/theme.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <RegionProvider>
          <AuthProvider>
            <MiniPlayerProvider>
              <App />
            </MiniPlayerProvider>
          </AuthProvider>
        </RegionProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
