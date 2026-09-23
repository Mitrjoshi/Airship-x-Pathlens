import { Link } from '@tanstack/react-router'
import { ArrowUpRightIcon } from 'lucide-react'

import { Button } from '@workspace/ui/components/button'

export const Footer = () => {
  return (
    <div className="dotted-background border-t-2 border-dashed">
      <footer className="bg-background mx-auto w-full max-w-[100rem] border-x-2 border-dashed">
        <div className="nut-top-right nut-top-left mx-auto max-w-[75%] border-x-2 border-dashed">
          <div className="border-b-2 border-dashed px-6 py-16 md:px-10 md:py-20">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-muted-foreground mb-3 text-sm font-medium">
                  Understand what actually matters
                </p>

                <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">
                  See how people
                  <br />
                  experience your website.
                </h2>

                <p className="text-muted-foreground mt-5 max-w-xl text-sm leading-6 md:text-base">
                  Pathlens gives you clear, privacy-conscious insights into
                  traffic, engagement, and user behaviour without unnecessary
                  complexity.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link to="/sign-up">
                  <Button>
                    Get started
                    <ArrowUpRightIcon />
                  </Button>
                </Link>

                <Link to="/docs">
                  <Button variant="outline">View documentation</Button>
                </Link>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-muted-foreground text-sm">
              © {new Date().getFullYear()} Pathlens. All rights reserved.
            </p>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <Link
                to="/terms"
                className="text-muted-foreground hover:text-foreground text-sm transition-colors"
              >
                Terms & Conditions
              </Link>

              <Link
                to="/privacy"
                className="text-muted-foreground hover:text-foreground text-sm transition-colors"
              >
                Privacy
              </Link>

              <Link
                to="/cookies"
                className="text-muted-foreground hover:text-foreground text-sm transition-colors"
              >
                Cookies
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
