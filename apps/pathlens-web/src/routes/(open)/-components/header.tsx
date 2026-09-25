import { ArrowRightIcon, ChevronRightIcon } from 'lucide-react'

import { ModeToggle } from '@/components/common/mode-toggle'
import { Button } from '@workspace/ui/components/button'
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from '@workspace/ui/components/navigation-menu'
import { Separator } from '@workspace/ui/components/separator'

import { productSections } from '../products/-constants/products'
import { solutionSections } from '../solutions/-constants/solutions'
import { Link } from '@tanstack/react-router'

export const Header = () => {
  const token = localStorage.getItem('pathlens-token')

  return (
    <div className="dotted-background sticky top-0 z-12 border-b-2 border-dashed">
      <nav className="bg-background z-12 mx-auto w-full max-w-[100rem] border-x-2 border-dashed">
        <div className="mx-auto flex max-w-[75%] items-center justify-between border-x-2 border-dashed px-5 py-2">
          <Link to="/" className="flex items-center">
            <img
              src="/logo.png"
              className="size-10 dark:invert"
              alt="Pathlens"
            />

            <p className="text-2xl font-bold">Pathlens</p>
          </Link>

          <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-2">
            <NavigationMenu align="center">
              <NavigationMenuList>
                <NavigationMenuItem value="products">
                  <NavigationMenuTrigger
                    render={
                      <a
                        onClick={(e) => {
                          e.stopPropagation()
                        }}
                        href="/products"
                      />
                    }
                    className="cursor-pointer"
                  >
                    Products
                  </NavigationMenuTrigger>

                  <NavigationMenuContent className="p-2">
                    <Products />
                  </NavigationMenuContent>
                </NavigationMenuItem>

                <NavigationMenuItem value="solutions">
                  <NavigationMenuTrigger
                    render={
                      <a
                        onClick={(e) => {
                          e.stopPropagation()
                        }}
                        href="/solutions"
                      />
                    }
                    className="cursor-pointer"
                  >
                    Solutions
                  </NavigationMenuTrigger>

                  <NavigationMenuContent className="p-2">
                    <Solutions />
                  </NavigationMenuContent>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>

            <a href="/pricing">
              <p className={navigationMenuTriggerStyle()}>Pricing</p>
            </a>
          </div>

          <div className="flex items-center gap-2">
            {token ? (
              <Link to="/app">
                <Button>Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="outline">Log in</Button>
                </Link>

                <Link to="/sign-up">
                  <Button>Sign up</Button>
                </Link>
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

export function Products() {
  return (
    <>
      <div className="bg-background grid w-7xl grid-cols-5 divide-x self-center rounded-md border">
        {productSections.map((section) => (
          <div key={section.title} className="space-y-2 p-2">
            <p className="text-muted-foreground pt-2 pl-2 text-sm">
              {section.title}
            </p>

            <div className="flex flex-col space-y-2">
              {section.items.map((item) => {
                const productId = item.title.replaceAll(' ', '-').toLowerCase()

                return (
                  <NavigationMenuLink
                    onClick={(e) => {
                      e.stopPropagation()
                    }}
                    render={
                      <a
                        key={item.title}
                        onClick={(e) => {
                          e.stopPropagation()
                        }}
                        href={`/products/${productId}`}
                        className="group flex w-full items-start gap-4 rounded-md p-2"
                      />
                    }
                  >
                    <div className="bg-secondary/80 flex aspect-square size-8 shrink-0 items-center justify-center rounded-md border">
                      <item.icon
                        size={16}
                        className="text-muted-foreground group-hover:text-foreground duration-200"
                      />
                    </div>

                    <div className="min-w-0">
                      <p className="flex items-center text-sm">
                        {item.title}

                        <ChevronRightIcon
                          size={14}
                          className="text-muted-foreground group-hover:text-foreground ml-1 -translate-x-1 opacity-0 duration-200 group-hover:translate-x-0 group-hover:opacity-100"
                        />
                      </p>

                      <p className="text-muted-foreground group-hover:text-foreground text-xs duration-200">
                        {item.description}
                      </p>
                    </div>
                  </NavigationMenuLink>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-2">
        <NavigationMenuLink
          className={'p-0 hover:bg-transparent'}
          render={
            <a
              onClick={(e) => {
                e.stopPropagation()
              }}
              href="/products"
            />
          }
        >
          <Button variant="link" size="sm" className="text-primary">
            See all Products
            <ArrowRightIcon />
          </Button>
        </NavigationMenuLink>
      </div>
    </>
  )
}

export function Solutions() {
  return (
    <div className="bg-background grid w-4xl grid-cols-3 divide-x self-center rounded-md border">
      {solutionSections.slice(0, 4).map((section) => (
        <div key={section.title} className="space-y-2 p-2">
          <p className="text-muted-foreground pt-2 pl-2 text-sm">
            {section.title}
          </p>

          <div className="flex flex-col space-y-2">
            {section.items.map((item) => {
              const solutionId = item.title
                .toLowerCase()
                .replace(/&/g, 'and')
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '')

              return (
                <NavigationMenuLink
                  onClick={(e) => {
                    e.stopPropagation()
                  }}
                  render={
                    <a
                      key={item.title}
                      href={`/solutions/${solutionId}`}
                      onClick={(e) => {
                        e.stopPropagation()
                      }}
                      className="group flex w-full items-start gap-4 rounded-md p-2"
                    />
                  }
                >
                  <div className="bg-secondary/80 flex aspect-square size-8 shrink-0 items-center justify-center rounded-md border">
                    <item.icon
                      size={16}
                      className="text-muted-foreground group-hover:text-foreground duration-200"
                    />
                  </div>

                  <div className="min-w-0">
                    <p className="flex items-center text-sm">
                      {item.title}

                      <ChevronRightIcon
                        size={14}
                        className="text-muted-foreground group-hover:text-foreground ml-1 -translate-x-1 opacity-0 duration-200 group-hover:translate-x-0 group-hover:opacity-100"
                      />
                    </p>

                    <p className="text-muted-foreground group-hover:text-foreground text-xs duration-200">
                      {item.description}
                    </p>
                  </div>
                </NavigationMenuLink>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
