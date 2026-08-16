import { Link } from '@tanstack/react-router'
import { ArrowUpRight } from 'lucide-react'

import { ModeToggle } from '@/components/common/mode-toggle'
import { Button } from '@workspace/ui/components/button'

export function MarketingFooter() {
  return (
    <footer className="border-border bg-background border-t" id="footer">
      <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-16">
        <div className="grid gap-12 lg:grid-cols-[1.45fr_1fr_1fr_1fr]">
          <div>
            <Link
              to="/"
              className="flex items-center gap-2.5 font-semibold tracking-tight"
            >
              <span className="bg-muted/40 ring-border size-8 overflow-hidden rounded-lg ring-1">
                <img
                  src="/logo.png"
                  alt="PathLens"
                  className="landing-logo landing-logo-dark size-full object-contain"
                />
              </span>
              PathLens
            </Link>
            <p className="text-muted-foreground mt-5 max-w-xs text-sm leading-6">
              Calm, complete analytics for teams building what matters.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-6"
              render={<Link to="/sign-up" />}
            >
              Start seeing the signal
              <ArrowUpRight />
            </Button>
          </div>

          <div>
            <p className="text-muted-foreground/70 text-xs font-medium tracking-[0.16em] uppercase">
              Product
            </p>
            <div className="mt-5 space-y-3 text-sm">
              <Link
                className="text-muted-foreground hover:text-foreground block transition-colors"
                to="/product"
              >
                Product overview
              </Link>
              <a
                className="text-muted-foreground hover:text-foreground block transition-colors"
                href="/product#analytics"
              >
                Analytics
              </a>
              <a
                className="text-muted-foreground hover:text-foreground block transition-colors"
                href="/product#replay"
              >
                Session replay
              </a>
              <Link
                className="text-muted-foreground hover:text-foreground block transition-colors"
                to="/pricing"
              >
                Pricing
              </Link>
            </div>
          </div>

          <div>
            <p className="text-muted-foreground/70 text-xs font-medium tracking-[0.16em] uppercase">
              Explore
            </p>
            <div className="mt-5 space-y-3 text-sm">
              <Link
                className="text-muted-foreground hover:text-foreground block transition-colors"
                to="/customers"
              >
                Customer stories
              </Link>
              <Link
                className="text-muted-foreground hover:text-foreground block transition-colors"
                to="/resources"
              >
                Resources
              </Link>
              <a
                className="text-muted-foreground hover:text-foreground block transition-colors"
                href="/resources#setup"
              >
                Quick start
              </a>
              <a
                className="text-muted-foreground hover:text-foreground block transition-colors"
                href="/resources#faq"
              >
                FAQ
              </a>
            </div>
          </div>

          <div>
            <p className="text-muted-foreground/70 text-xs font-medium tracking-[0.16em] uppercase">
              Company
            </p>
            <div className="mt-5 space-y-3 text-sm">
              <a
                className="text-muted-foreground hover:text-foreground block transition-colors"
                href="mailto:hello@pathlens.io"
              >
                Contact us
              </a>
              <a
                className="text-muted-foreground hover:text-foreground block transition-colors"
                href="/resources#privacy"
              >
                Privacy approach
              </a>
              <Link
                className="text-muted-foreground hover:text-foreground block transition-colors"
                to="/login"
              >
                Workspace login
              </Link>
              <Link
                className="text-muted-foreground hover:text-foreground block transition-colors"
                to="/sign-up"
              >
                Create an account
              </Link>
            </div>
          </div>
        </div>

        <div className="border-border mt-12 flex flex-col items-center justify-between gap-4 border-t pt-6 text-xs sm:flex-row">
          <div className="text-muted-foreground/70 flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>© 2026 PathLens. All rights reserved.</span>
            <span>Made for teams who care about the details.</span>
          </div>
          <div className="flex items-center gap-3">
            <a
              className="text-muted-foreground hover:text-foreground transition-colors"
              href="mailto:hello@pathlens.io"
            >
              Contact
            </a>
            <ModeToggle />
          </div>
        </div>
      </div>
    </footer>
  )
}
