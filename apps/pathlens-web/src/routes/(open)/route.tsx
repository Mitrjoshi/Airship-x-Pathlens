import { createFileRoute, Outlet, Link } from '@tanstack/react-router'
import { Button } from '@workspace/ui/components/button'
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from '@workspace/ui/components/navigation-menu'
import { ArrowRightIcon, ChevronRightIcon } from 'lucide-react'
import { useState } from 'react'
import { solutionSections } from './products/-constants/solutions'
import { productSections } from './products/-constants/products'
import { ModeToggle } from '@/components/common/mode-toggle'
import { Separator } from '@workspace/ui/components/separator'

export const Route = createFileRoute('/(open)')({
  component: RouteComponent,
})

function RouteComponent() {
  const [menuValue, setMenuValue] = useState('')

  const closeMenu = () => setMenuValue('')

  return (
    <div>
      <nav className="bg-background sticky top-0 z-10 border-b-2 border-dashed py-2">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
          <Link to="/" className="flex items-center">
            <img
              src="/logo.png"
              className="size-10 dark:invert"
              alt="pathlens"
            />
            <p className="text-2xl font-bold">Pathlens</p>
          </Link>

          <div className="flex items-center gap-2">
            <NavigationMenu
              align="center"
              value={menuValue}
              onValueChange={setMenuValue}
            >
              <NavigationMenuList>
                <NavigationMenuItem value="products">
                  <NavigationMenuTrigger>Products</NavigationMenuTrigger>

                  <NavigationMenuContent className="p-2">
                    <Products onNavigate={closeMenu} />
                  </NavigationMenuContent>
                </NavigationMenuItem>

                <NavigationMenuItem value="solutions">
                  <NavigationMenuTrigger>Solutions</NavigationMenuTrigger>

                  <NavigationMenuContent className="p-2">
                    <Solutions onNavigate={closeMenu} />
                  </NavigationMenuContent>
                </NavigationMenuItem>

                {/* <NavigationMenuItem value="resources">
                  <NavigationMenuTrigger>Resources</NavigationMenuTrigger>

                  <NavigationMenuContent>
                    <Resources onNavigate={closeMenu} />
                  </NavigationMenuContent>
                </NavigationMenuItem> */}
              </NavigationMenuList>
            </NavigationMenu>

            <Link to="/pricing">
              <p className={navigationMenuTriggerStyle()}>Pricing</p>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/login">
              <Button variant={'outline'}>Log in</Button>
            </Link>

            <Link to="/login">
              <Button>Start Tracking</Button>
            </Link>

            <Separator orientation="vertical" />

            <ModeToggle />
          </div>
        </div>
      </nav>

      <Outlet />
    </div>
  )
}

export function Products({ onNavigate }: { onNavigate: () => void }) {
  return (
    <div>
      <div className="bg-background grid w-6xl grid-cols-4 divide-x self-center rounded-md border">
        {productSections.slice(0, 4).map((item) => (
          <div key={item.title} className="space-y-2 p-2">
            <p className="text-muted-foreground pt-2 pl-2 text-sm">
              {item.title}
            </p>

            <div className="flex flex-col space-y-2">
              {item.items.map((list) => (
                <Link
                  key={list.title}
                  to="/products/$productId"
                  params={{
                    productId: list.title.replaceAll(' ', '-').toLowerCase(),
                  }}
                  onClick={onNavigate}
                >
                  <div className="group flex w-full items-start gap-4 rounded-md p-2">
                    <div className="bg-secondary/80 flex aspect-square size-8 items-center justify-center rounded-md border">
                      <list.icon
                        className="text-muted-foreground group-hover:text-foreground duration-200"
                        size={16}
                      />
                    </div>

                    <div>
                      <p className="flex items-center text-sm">
                        {list.title}

                        <ChevronRightIcon
                          size={14}
                          className="text-muted-foreground group-hover:text-foreground opacity-0 duration-200 group-hover:translate-x-1.5 group-hover:opacity-100"
                        />
                      </p>

                      <p className="text-muted-foreground group-hover:text-foreground text-xs duration-200">
                        {list.description}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-2">
        <Link to="/products" onClick={onNavigate}>
          <Button variant="link" size="sm" className="text-primary">
            See all Products <ArrowRightIcon />
          </Button>
        </Link>
      </div>
    </div>
  )
}

export function Solutions({ onNavigate }: { onNavigate: () => void }) {
  return (
    <div className="bg-background grid w-4xl grid-cols-3 divide-x self-center rounded-md border">
      {solutionSections.slice(0, 4).map((item) => (
        <div key={item.title} className="space-y-2 p-2">
          <p className="text-muted-foreground pt-2 pl-2 text-sm">
            {item.title}
          </p>

          <div className="flex flex-col space-y-2">
            {item.items.map((list) => (
              <Link
                key={list.title}
                to="/products/$productId"
                params={{
                  productId: list.title.replaceAll(' ', '-').toLowerCase(),
                }}
                onClick={onNavigate}
              >
                <div className="group flex w-full items-start gap-4 rounded-md p-2">
                  <div className="bg-secondary/80 flex aspect-square size-8 items-center justify-center rounded-md border">
                    <list.icon
                      className="text-muted-foreground group-hover:text-foreground duration-200"
                      size={16}
                    />
                  </div>

                  <div>
                    <p className="flex items-center text-sm">
                      {list.title}

                      <ChevronRightIcon
                        size={14}
                        className="text-muted-foreground group-hover:text-foreground opacity-0 duration-200 group-hover:translate-x-1.5 group-hover:opacity-100"
                      />
                    </p>

                    <p className="text-muted-foreground group-hover:text-foreground text-xs duration-200">
                      {list.description}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
