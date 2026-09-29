import {
  createFileRoute,
  Outlet,
  redirect,
  type ErrorComponentProps,
} from '@tanstack/react-router'
import { getUsersOptions } from '@/queries/user'
import { motion } from 'motion/react'

export const Route = createFileRoute('/app')({
  component: RouteComponent,
  beforeLoad: async ({ context }) => {
    const token = localStorage.getItem('pathlens-token')
    if (!token) {
      throw redirect({ to: '/login' })
    }

    //add interval
    // await new Promise((resolve) => setTimeout(resolve, 300_000))

    const res = await context.queryClient.ensureQueryData(getUsersOptions())
    return { user: res.data }
  },
  pendingComponent: () => <LoadingComponent />,
  pendingMinMs: 3000,
  errorComponent: (props) => <ErrorComponent {...props} />,
})

function RouteComponent() {
  return (
    <>
      <Outlet />
    </>
  )
}

const LoadingComponent = () => {
  return (
    <div className="bg-background fixed inset-0 z-[99999] flex min-h-screen w-full items-center justify-center overflow-hidden">
      <div className="line-grid-uni relative flex h-full w-full flex-col items-center justify-center overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center"
        >
          <p className="text-xl font-medium">Loading...</p>

          <div className="bg-muted mx-auto mt-5 h-1 w-32 overflow-hidden">
            <motion.div
              className="bg-foreground h-full w-1/3"
              animate={{
                x: ['-100%', '300%'],
              }}
              transition={{
                duration: 1.4,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          </div>
        </motion.div>
      </div>
    </div>
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

          <button
            type="button"
            onClick={reset}
            className="text-muted-foreground hover:text-foreground mt-4 cursor-pointer text-xs transition-colors"
          >
            Try again
          </button>
        </motion.div>
      </div>
    </div>
  )
}
