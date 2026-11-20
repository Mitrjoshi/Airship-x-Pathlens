import { ModeToggle } from '@/components/common/mode-toggle'
import { NavUser } from '@/components/common/nav-user'
import { getUsersOptions } from '@/queries/user'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Button } from '@workspace/ui/components/button'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@workspace/ui/components/input-group'
import { Separator } from '@workspace/ui/components/separator'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { SearchIcon } from 'lucide-react'

export const Header = ({ showLogo = true }: { showLogo?: boolean }) => {
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
          <div className="flex items-center gap-6">
            {showLogo && (
              <>
                <Link to="/docs" className="flex items-center gap-2">
                  <img src="/logo.svg" className="size-8" alt="Pathlens" />

                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold duration-200">Pathlens</p>
                    <Button size="xs" className={'mt-0.75'} variant={'outline'}>
                      DOCS
                    </Button>
                  </div>
                </Link>
              </>
            )}

            <div className="flex items-center">
              <Button render={<Link to="/docs/directory" />} variant="ghost">
                Directory
              </Button>

              <Button render={<Link to="/docs" />} variant="ghost">
                Products
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <InputGroup className="w-70">
              <InputGroupAddon>
                <SearchIcon />
              </InputGroupAddon>
              <InputGroupInput placeholder="Search..." />
              <InputGroupText className="mr-2">
                <kbd>Ctrl+K</kbd>
              </InputGroupText>
            </InputGroup>

            {isLoading ? (
              <Skeleton className="aspect-square size-8 rounded-full" />
            ) : (
              <>
                {user ? (
                  <>
                    <Separator orientation="vertical" />
                    <Button render={<Link to="/app" />}>Dashboard</Button>
                    <NavUser user={user!} />
                  </>
                ) : (
                  <Button render={<Link to="/login" />}>Login</Button>
                )}
              </>
            )}

            <Separator orientation="vertical" />

            <ModeToggle />
          </div>
        </div>
      </nav>
    </div>
  )
}
