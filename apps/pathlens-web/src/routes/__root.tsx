import * as React from 'react'
import {
  Outlet,
  createRootRoute,
  type ErrorComponentProps,
} from '@tanstack/react-router'
import { NotFound } from '@/components/common/not-found'
import { Header } from './(open)/-components/header'
import { Footer } from './(open)/-components/footer'
import { Button } from '@workspace/ui/components/button'
import { motion } from 'motion/react'

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: () => (
    <>
      <Header />
      <NotFound />
      <Footer />
    </>
  ),
  errorComponent: (props) => <ErrorComponent {...props} />,
})

function RootComponent() {
  return (
    <React.Fragment>
      <Outlet />
    </React.Fragment>
  )
}

const ErrorComponent = ({ reset, error }: ErrorComponentProps) => {
  return (
    <div className="bg-background fixed inset-0 z-[99999] flex min-h-screen w-full items-center justify-center overflow-hidden">
      <div className="line-grid-uni relative flex h-full w-full flex-col items-center justify-center overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center"
        >
          <p className="text-xl font-medium">
            {error?.message || 'Something went wrong'}
          </p>

          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.4 }}
            className="bg-destructive mx-auto mt-5 h-1 w-32"
          />

          <Button
            type="button"
            variant="ghost"
            onClick={reset}
            className={'mt-2'}
          >
            Try again
          </Button>
        </motion.div>
      </div>
    </div>
  )
}
