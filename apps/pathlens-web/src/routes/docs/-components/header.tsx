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
import { SearchIcon, SparkleIcon } from 'lucide-react'

export const Header = () => {
  const token = localStorage.getItem('pathlens-token')

  const { data: userData, isLoading } = useQuery({
    ...getUsersOptions(),
    enabled: !!token,
  })

  const user = userData?.data

  return (
    <div className="sticky top-0 z-12 flex h-14.25 items-center border-b-2 border-dashed">
      <nav className="bg-background z-12 w-full border-dashed px-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-12">
            <Link to="/docs" className="group flex items-center gap-2">
              <img src="/logo.svg" className="size-8" alt="Pathlens" />

              <div className="flex items-center gap-2">
                <p className="group-hover:text-primary text-2xl font-bold duration-200">
                  Pathlens
                </p>
                <Button size="xs" className={'mt-0.75'} variant={'outline'}>
                  DOCS
                </Button>
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
            <InputGroup className="w-70">
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
