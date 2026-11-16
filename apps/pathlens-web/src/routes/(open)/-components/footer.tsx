import { Link } from '@tanstack/react-router'
import { ArrowUpRightIcon } from 'lucide-react'

import { Button } from '@workspace/ui/components/button'
import { ModeToggle } from '@/components/common/mode-toggle'

export const Footer = () => {
  return (
    <div className="dotted-background border-t-2 border-dashed">
      <footer className="bg-background mx-auto w-full max-w-[100rem] border-x-2 border-dashed">
        <div className="md:nut-top-right md:nut-top-left mx-auto border-dashed md:max-w-[75%] md:border-x-2">
          <div className="border-b-2 border-dashed px-6 py-16 md:px-10 md:py-20">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl space-y-2">
                <p className="text-muted-foreground text-sm font-medium">
                  Understand what actually matters
                </p>

                <h2 className="text-3xl font-medium tracking-tight md:text-4xl">
                  See how people
                  <br />
                  experience your website.
                </h2>

                <p className="text-muted-foreground max-w-xl text-sm leading-6 md:text-base">
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
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 p-4">
            <div className="flex w-full flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <p className="text-muted-foreground text-xs md:text-sm">
                © {new Date().getFullYear()} Pathlens. All rights reserved.
              </p>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                {/* <Link
                  to="/careers"
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  Careers
                </Link> */}

                <Link
                  to="/terms"
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  Terms of Use
                </Link>

                <Link
                  to="/privacy"
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  Privacy
                </Link>
              </div>
            </div>
            <ModeToggle />
          </div>
        </div>
      </footer>
    </div>
  )
}
