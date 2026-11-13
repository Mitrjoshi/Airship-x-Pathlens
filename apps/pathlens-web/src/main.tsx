import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import './index.css'
import { Toaster } from 'sonner'

// Import the generated route tree
import { routeTree } from './routeTree.gen'
import { ThemeProvider } from './components/common/theme-provider'
import { TooltipProvider } from '@workspace/ui/components/tooltip'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { NotFound } from './components/common/not-found'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
})

// Create a new router instance
const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultNotFoundComponent: () => <NotFound />,
})

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// Render the app
const rootElement = document.getElementById('root')!
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <StrictMode>
      <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
        <TooltipProvider>
          <Toaster position="bottom-right" richColors />
          <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
          </QueryClientProvider>
        </TooltipProvider>
      </ThemeProvider>
    </StrictMode>
  )
}
