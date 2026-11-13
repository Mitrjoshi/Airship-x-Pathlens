import { createFileRoute, Outlet } from '@tanstack/react-router'
import { Header } from './-components/header'

export const Route = createFileRoute('/docs')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <>
      <Header />
      <Outlet />
    </>
  )
}
