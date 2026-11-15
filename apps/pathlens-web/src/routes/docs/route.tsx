import { createFileRoute, Outlet } from '@tanstack/react-router'
import { Header } from './-components/header'
import { Footer } from '../(open)/-components/footer'
import { FAQ } from '../(open)/-components/faq'

export const Route = createFileRoute('/docs')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <>
      <div className="w-full">
        <Header />
        <Outlet />
        <FAQ />
        <Footer />
      </div>
    </>
  )
}
