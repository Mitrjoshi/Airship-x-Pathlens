import { createFileRoute, Outlet } from '@tanstack/react-router'
import { Header } from './-components/header'
import { Footer } from './-components/footer'
import { FAQ } from './-components/faq'
import { NotFound } from '@/components/common/not-found'

export const Route = createFileRoute('/(open)')({
  component: RouteComponent,
  notFoundComponent: () => <NotFound />,
})

function RouteComponent() {
  return (
    <>
      <Header />
      <Outlet />
      <FAQ />
      <Footer />
    </>
  )
}
