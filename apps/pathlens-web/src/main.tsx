import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import './index.css'

// Import the generated route tree
import { routeTree } from './routeTree.gen'
import { ThemeProvider } from './components/common/theme-provider'
import { TooltipProvider } from '@workspace/ui/components/tooltip'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { NotFound } from './components/common/not-found'
import { Toaster } from '@workspace/ui/components/toast'

export const queryClient = new QueryClient({})

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
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <TooltipProvider>
          <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
            <Toaster timeout={4000} />
          </QueryClientProvider>
        </TooltipProvider>
      </ThemeProvider>
    </StrictMode>
  )
}
