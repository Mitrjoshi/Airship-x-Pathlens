import { createFileRoute, Outlet } from '@tanstack/react-router'
import { Header } from '../(open)/-components/header'
import { Footer } from '../(open)/-components/footer'
import { NotFound } from '@/components/common/not-found'

export const Route = createFileRoute('/(references)')({
  component: RouteComponent,
  notFoundComponent: () => <NotFound />,
})

function RouteComponent() {
  return (
    <>
      <Header />
      <Outlet />
      <Footer />
    </>
  )
}
