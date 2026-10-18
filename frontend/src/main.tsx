/**
 * Application entry point. Mounts the React app into the #root div
 * defined in index.html. StrictMode enables additional development warnings.
 * Wraps the app in the root error boundary and React Query provider.
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'
import RootErrorBoundary from './components/ui/RootErrorBoundary.tsx'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1 } },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </RootErrorBoundary>
  </StrictMode>,
)
