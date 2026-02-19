import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { RegionProvider } from '@/components/providers/RegionProvider'
import { AuthProvider } from '@/hooks/useAuth'
import App from './App'
import './styles/theme.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <RegionProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </RegionProvider>
      </BrowserRouter>
  </StrictMode>,
)
