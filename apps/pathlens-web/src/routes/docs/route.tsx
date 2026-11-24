import { createFileRoute, Outlet } from '@tanstack/react-router'
import { Header } from './-components/header'
import { Footer } from '../(open)/-components/footer'
import { NotFound } from '@/components/common/not-found'

export const Route = createFileRoute('/docs')({
  component: RouteComponent,
  notFoundComponent: () => <NotFound />,
})

function RouteComponent() {
  return (
    <>
      <div className="w-full">
        <Header />
        <Outlet />
        <Footer />
      </div>
    </>
  )
}
