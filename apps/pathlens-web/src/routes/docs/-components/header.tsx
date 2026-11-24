import { ModeToggle } from '@/components/common/mode-toggle'
import { NavUser } from '@/components/common/nav-user'
import { getUsersOptions } from '@/queries/user'
import { useQuery } from '@tanstack/react-query'
import { Link, useLocation } from '@tanstack/react-router'
import { Button } from '@workspace/ui/components/button'
import { Separator } from '@workspace/ui/components/separator'
import { Skeleton } from '@workspace/ui/components/skeleton'

export const Header = ({ showLogo = true }: { showLogo?: boolean }) => {
  const { pathname } = useLocation()

  const token = localStorage.getItem('pathlens-token')

  const { data: userData, isLoading } = useQuery({
    ...getUsersOptions(),
    enabled: !!token,
  })

  const user = userData?.data

  return (
    <div className="sticky top-0 z-12 flex h-14.25 items-center border-b-2 border-dashed">
      <nav className="bg-background z-12 flex h-full w-full items-center px-5">
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-5">
            {showLogo && (
              <>
                <Link to="/docs" className="flex h-12 items-center gap-0.5">
                  <div className="flex items-center">
                    <img
                      src="/logo-full-light.png"
                      className="block h-12 w-40 object-cover dark:hidden"
                      alt="Pathlens"
                    />

                    <img
                      src="/logo-full-dark.png"
                      className="hidden h-12 w-40 object-cover dark:block"
                      alt="Pathlens"
                    />
                  </div>

                  <Button size="xs" className={'mt-1'} variant={'outline'}>
                    DOCS
                  </Button>
                </Link>
              </>
            )}

            <Separator className={'my-auto h-8'} orientation="vertical" />

            <div className="flex items-center">
              <Button render={<Link to="/docs/directory" />} variant="ghost">
                Directory
              </Button>

              <Button render={<Link to="/docs/change-log" />} variant="ghost">
                Changelog
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isLoading ? (
              <Skeleton className="aspect-square size-8 rounded-full" />
            ) : (
              <>
                {user ? (
                  <>
                    <Button render={<Link to="/app" />}>Dashboard</Button>
                    <NavUser user={user!} />
                  </>
                ) : (
                  <>
                    <Button
                      render={
                        <Link
                          to="/login"
                          search={{
                            redirect: pathname,
                          }}
                        />
                      }
                    >
                      Login
                    </Button>
                    <Separator orientation="vertical" />
                    <ModeToggle />
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </nav>
    </div>
  )
}
