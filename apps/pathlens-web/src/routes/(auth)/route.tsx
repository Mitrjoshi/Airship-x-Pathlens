import { NotFound } from '@/components/common/not-found'
import {
  createFileRoute,
  Outlet,
  redirect,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import { Button } from '@workspace/ui/components/button'
import { ArrowLeft } from 'lucide-react'

export const Route = createFileRoute('/(auth)')({
  component: RouteComponent,
  notFoundComponent: () => <NotFound />,
  beforeLoad: () => {
    const token = localStorage.getItem('pathlens-token')

    if (token) {
      throw redirect({ to: '/app' })
    }
  },
})

function RouteComponent() {
  const { history } = useRouter()
  const navigate = useNavigate()

  return (
    <div className="grid h-screen items-center md:grid-cols-[0.4fr_1fr] md:justify-center md:divide-x">
      <div className="relative flex h-screen flex-1 items-center p-8 md:justify-center">
        <Button
          className="absolute top-4 left-4 flex items-center justify-between"
          variant="ghost"
          onClick={() => {
            if (history.canGoBack()) {
              history.back()
            } else {
              navigate({
                to: '/',
              })
            }
          }}
        >
          <ArrowLeft />
          Back
        </Button>

        <Outlet />
      </div>

      <div className="relative hidden h-screen flex-1 items-center justify-center overflow-hidden md:flex">
        <video
          muted
          loop
          autoPlay
          className="md:h-[80dvh]"
          playsInline
          preload="auto"
        >
          <source src="/visuals_clean.webm" type="video/webm" />
        </video>
      </div>
    </div>
  )
}
