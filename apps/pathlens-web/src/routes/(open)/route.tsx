import { createFileRoute, Outlet } from '@tanstack/react-router'
import { Header } from './-components/header'
import { Footer } from './-components/footer'

export const Route = createFileRoute('/(open)')({
  component: RouteComponent,
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
