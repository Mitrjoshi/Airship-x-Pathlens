import { Link } from '@tanstack/react-router'
import { ArrowUpRight, Menu } from 'lucide-react'
import { useState } from 'react'

import { ModeToggle } from '@/components/common/mode-toggle'
import { Button } from '@workspace/ui/components/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@workspace/ui/components/sheet'

export type MarketingNavKey = 'product' | 'pricing' | 'customers' | 'resources'

const navigation = [
  { label: 'Product', to: '/product', key: 'product' },
  { label: 'Pricing', to: '/pricing', key: 'pricing' },
  { label: 'Customers', to: '/customers', key: 'customers' },
  { label: 'Resources', to: '/resources', key: 'resources' },
] as const

export function MarketingHeader({ active }: { active?: MarketingNavKey }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="border-border/60 bg-background/80 sticky top-0 z-30 border-b backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
        <Link
          to="/"
          className="flex shrink-0 items-center gap-2.5 font-semibold tracking-tight"
        >
          <span className="bg-background/80 ring-foreground/10 size-8 overflow-hidden rounded-lg shadow-sm ring-1">
            <img
              src="/logo.png"
              alt="PathLens"
              className="landing-logo size-full object-contain"
            />
          </span>
          PathLens
        </Link>

        <nav className="text-muted-foreground hidden items-center gap-7 text-sm md:flex">
          {navigation.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`hover:text-foreground relative py-2 transition-colors ${
                active === item.key ? 'text-foreground' : ''
              }`}
              activeProps={{ 'aria-current': 'page' }}
            >
              {item.label}
              {active === item.key && (
                <span className="bg-foreground absolute inset-x-0 -bottom-0.5 h-px" />
              )}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 sm:flex">
            <ModeToggle />
            <Button variant="ghost" render={<Link to="/login" />}>
              Log in
            </Button>
            <Button render={<Link to="/sign-up" />}>
              Start free
              <ArrowUpRight />
            </Button>
          </div>

          <div className="flex items-center gap-2 sm:hidden">
            <ModeToggle />
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger
                render={
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Open navigation"
                  />
                }
              >
                <Menu />
              </SheetTrigger>
              <SheetContent
                side="right"
                className="w-[min(22rem,calc(100vw-1rem))]"
              >
                <SheetHeader className="border-b px-5 py-5">
                  <SheetTitle className="flex items-center gap-2.5">
                    <span className="bg-muted/50 ring-border size-8 overflow-hidden rounded-lg ring-1">
                      <img
                        src="/logo.png"
                        alt=""
                        className="landing-logo size-full object-contain"
                      />
                    </span>
                    PathLens
                  </SheetTitle>
                  <SheetDescription>
                    Product intelligence without the noise.
                  </SheetDescription>
                </SheetHeader>

                <nav className="flex flex-col gap-1 p-4">
                  {navigation.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setMobileOpen(false)}
                      className={`hover:bg-muted rounded-lg px-3 py-3 text-sm font-medium transition-colors ${
                        active === item.key
                          ? 'bg-muted text-foreground'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>

                <SheetFooter className="border-t px-5 py-5">
                  <Button
                    variant="outline"
                    render={
                      <Link to="/login" onClick={() => setMobileOpen(false)} />
                    }
                  >
                    Log in
                  </Button>
                  <Button
                    render={
                      <Link
                        to="/sign-up"
                        onClick={() => setMobileOpen(false)}
                      />
                    }
                  >
                    Start free
                    <ArrowUpRight />
                  </Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  )
}
