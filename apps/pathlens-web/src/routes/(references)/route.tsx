import { createFileRoute, Outlet } from '@tanstack/react-router'
import { Header } from '../(open)/-components/header'
import { Footer } from '../(open)/-components/footer'

export const Route = createFileRoute('/(references)')({
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
