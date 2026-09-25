import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { getUsersOptions } from '@/queries/user'
import { motion } from 'motion/react'

export const Route = createFileRoute('/app')({
  component: RouteComponent,
  beforeLoad: async ({ context }) => {
    const token = localStorage.getItem('pathlens-token')
    if (!token) {
      throw redirect({ to: '/login' })
    }

    const res = await context.queryClient.ensureQueryData(getUsersOptions())
    return { user: res.data }
  },
  pendingComponent: () => <LoadingComponent />,
  pendingMinMs: 1000,
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
    <div className="bg-background fixed inset-0 z-[99999] flex min-h-screen w-full items-center justify-center">
      <div className="flex flex-col items-center">
        {/* Brand */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-foreground text-xl font-medium tracking-tight"
        >
          Pathlens
        </motion.div>

        {/* Loading line */}
        <div className="bg-muted mt-5 h-px w-32 overflow-hidden">
          <motion.div
            className="bg-primary h-full w-1/3"
            animate={{
              x: ['-100%', '300%'],
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        </div>

        <motion.p
          className="text-muted-foreground mt-3 text-xs"
          animate={{
            opacity: [0.4, 1, 0.4],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          Loading workspace
        </motion.p>
      </div>
    </div>
  )
}
