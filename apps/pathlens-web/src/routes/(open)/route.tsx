import { createFileRoute, Outlet } from '@tanstack/react-router'
import { Header } from './-components/header'
import { Footer } from './-components/footer'
import { FAQ } from './-components/faq'

export const Route = createFileRoute('/(open)')({
  component: RouteComponent,
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
