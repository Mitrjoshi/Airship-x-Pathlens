import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowRightIcon, ChevronRightIcon } from 'lucide-react'

import { ModeToggle } from '@/components/common/mode-toggle'
import { Button } from '@workspace/ui/components/button'
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from '@workspace/ui/components/navigation-menu'
import { Separator } from '@workspace/ui/components/separator'

import { productSections } from '../products/-constants/products'
import { solutionSections } from '../products/-constants/solutions'

type MenuContentProps = {
  onNavigate: () => void
}

export const Header = () => {
  const [menuValue, setMenuValue] = useState('')

  const closeMenu = () => {
    setMenuValue('')
  }

  return (
    <div className="dotted-background sticky top-0 z-10 border-b-2 border-dashed">
      <nav className="bg-background z-10 mx-auto w-full max-w-[90vw] border-x-2 border-dashed">
        <div className="mx-auto flex max-w-[75%] items-center justify-between border-x-2 border-dashed px-5 py-2">
          <Link to="/" className="flex items-center" onClick={closeMenu}>
            <img
              src="/logo.png"
              className="size-10 dark:invert"
              alt="Pathlens"
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
                  <NavigationMenuTrigger className="cursor-pointer">
                    Products
                  </NavigationMenuTrigger>

                  <NavigationMenuContent className="p-2">
                    <Products onNavigate={closeMenu} />
                  </NavigationMenuContent>
                </NavigationMenuItem>

                <NavigationMenuItem value="solutions">
                  <NavigationMenuTrigger className="cursor-pointer">
                    Solutions
                  </NavigationMenuTrigger>

                  <NavigationMenuContent className="p-2">
                    <Solutions onNavigate={closeMenu} />
                  </NavigationMenuContent>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>

            <Link to="/pricing" onClick={closeMenu}>
              <p className={navigationMenuTriggerStyle()}>Pricing</p>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/login" onClick={closeMenu}>
              <Button variant="outline">Log in</Button>
            </Link>

            <Link to="/login" onClick={closeMenu}>
              <Button>Start Tracking</Button>
            </Link>

            {/* <Separator orientation="vertical" />

            <ModeToggle /> */}
          </div>
        </div>
      </nav>
    </div>
  )
}

export function Products({ onNavigate }: MenuContentProps) {
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
                  <Link
                    key={item.title}
                    to="/products/$productId"
                    params={{
                      productId,
                    }}
                    onClick={onNavigate}
                    className="group flex w-full items-start gap-4 rounded-md p-2"
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
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-2">
        <Link to="/products" onClick={onNavigate}>
          <Button variant="link" size="sm" className="text-primary">
            See all Products
            <ArrowRightIcon />
          </Button>
        </Link>
      </div>
    </>
  )
}

export function Solutions({ onNavigate }: MenuContentProps) {
  return (
    <div className="bg-background grid w-4xl grid-cols-3 divide-x self-center rounded-md border">
      {solutionSections.slice(0, 4).map((section) => (
        <div key={section.title} className="space-y-2 p-2">
          <p className="text-muted-foreground pt-2 pl-2 text-sm">
            {section.title}
          </p>

          <div className="flex flex-col space-y-2">
            {section.items.map((item) => {
              const solutionId = item.title.replaceAll(' ', '-').toLowerCase()

              return (
                <Link
                  key={item.title}
                  to="/products/$productId"
                  params={{
                    productId: solutionId,
                  }}
                  onClick={onNavigate}
                  className="group flex w-full items-start gap-4 rounded-md p-2"
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
                </Link>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
