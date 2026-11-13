import { NavUser } from '@/components/common/nav-user'
import { getUsersOptions } from '@/queries/user'
import { useQuery } from '@tanstack/react-query'
import { Link, useRouteContext } from '@tanstack/react-router'
import { Button } from '@workspace/ui/components/button'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from '@workspace/ui/components/input-group'
import { Separator } from '@workspace/ui/components/separator'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { SearchIcon, SparkleIcon } from 'lucide-react'

export const Header = () => {
  const token = localStorage.getItem('pathlens-token')

  const { data: userData, isLoading } = useQuery({
    ...getUsersOptions(),
    enabled: !!token,
  })

  const user = userData?.data

  return (
    <div className="sticky top-0 z-12 border-b-2 border-dashed">
      <nav className="bg-background z-12 w-full border-dashed px-5 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-12">
            <Link to="/docs" className="flex items-center">
              <img
                src="/logo.png"
                className="size-10 dark:invert"
                alt="Pathlens"
              />

              <div className="flex items-end gap-2">
                <p className="text-lg font-bold">Pathlens</p>
                <p className="text-primary mb-1 text-xs font-bold">DOCS</p>
              </div>
            </Link>

            <div className="flex items-center">
              <Button variant="ghost">Getting Started</Button>
              <Button variant="ghost">Tracking</Button>
              <Button variant="ghost">Integrations</Button>
              <Button variant="ghost">API Reference</Button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <InputGroup className="w-xs">
              <InputGroupAddon>
                <SearchIcon />
              </InputGroupAddon>
              <InputGroupInput placeholder="Search..." />
              <InputGroupText className="mr-2">
                <kbd>Ctrl+K</kbd>
              </InputGroupText>
            </InputGroup>

            <Button variant={'outline'}>
              <SparkleIcon />
              Ask AI
            </Button>

            <Separator orientation="vertical" />

            {isLoading ? (
              <Skeleton className="aspect-square size-8 rounded-full" />
            ) : (
              <>
                {user ? (
                  <NavUser user={user!} />
                ) : (
                  <Button render={<Link to="/login">Login</Link>}>Login</Button>
                )}
              </>
            )}
          </div>
        </div>
      </nav>
    </div>
  )
}
