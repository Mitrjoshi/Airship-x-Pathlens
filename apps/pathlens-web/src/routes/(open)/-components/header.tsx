import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ChevronRightIcon,
  MenuIcon,
  XIcon,
} from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
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
import { productSections } from '../products/-constants/products'
import { solutionSections } from '../solutions/-constants/solutions'
import { Link } from '@tanstack/react-router'
import { NavUser } from '@/components/common/nav-user'
import { useQuery } from '@tanstack/react-query'
import { getUsersOptions, type T_User } from '@/queries/user'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { useEffect, useState } from 'react'

type MenuState = 'default' | 'products' | 'solutions'
type NavigationDirection = 1 | -1

const overlayTransition = {
  duration: 0.2,
  ease: 'easeInOut' as const,
}

const screenTransition = {
  type: 'tween' as const,
  duration: 0.32,
  ease: [0.32, 0.72, 0, 1] as [number, number, number, number],
}

const screenVariants = {
  enter: (direction: NavigationDirection) => ({
    x: direction === 1 ? '100%' : '-30%',
    opacity: direction === 1 ? 1 : 0.75,
  }),
  center: {
    x: '0%',
    opacity: 1,
  },
  exit: (direction: NavigationDirection) => ({
    x: direction === 1 ? '-30%' : '100%',
    opacity: direction === 1 ? 0.75 : 1,
  }),
}

const createSlug = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

export const Header = () => {
  const token = localStorage.getItem('pathlens-token')
  const [open, setOpen] = useState(false)

  const { data: userData, isLoading } = useQuery({
    ...getUsersOptions(),
    enabled: !!token,
  })

  const user = userData?.data

  return (
    <div className="dotted-background sticky top-0 z-12 border-b-2 border-dashed">
      <nav className="bg-background z-12 mx-auto h-14.25 w-full max-w-[100rem] border-x-2 border-dashed">
        <div className="mx-auto flex h-14.25 items-center justify-between border-dashed px-5 lg:max-w-[75%] lg:border-x-2">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.svg" className="size-8" alt="Pathlens" />
            <p className="text-2xl font-bold">Pathlens</p>
          </Link>

          {/* Desktop Navigation */}
          <div className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-2 lg:flex">
            <NavigationMenu align="center">
              <NavigationMenuList>
                <NavigationMenuItem value="products">
                  <NavigationMenuTrigger
                    render={
                      <a
                        onClick={(e) => e.stopPropagation()}
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
                        onClick={(e) => e.stopPropagation()}
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

            <Link target="_blank" to="/docs">
              <p className={navigationMenuTriggerStyle()}>Docs</p>
            </Link>

            <Link to="/pricing">
              <p className={navigationMenuTriggerStyle()}>Pricing</p>
            </Link>
          </div>

          {/* Header Actions */}
          <div className="flex items-center gap-2">
            {isLoading ? (
              <Skeleton className="aspect-square size-8 rounded-full" />
            ) : (
              <>
                {user ? (
                  <>
                    <Link className="hidden lg:block" to="/app">
                      <Button>Dashboard</Button>
                    </Link>
                    <NavUser user={user} />
                  </>
                ) : (
                  <>
                    <Link to="/login">
                      <Button variant="outline">Log in</Button>
                    </Link>

                    <Link className="hidden md:block" to="/sign-up">
                      <Button>Sign up</Button>
                    </Link>
                  </>
                )}
              </>
            )}

            <Button
              onClick={() => setOpen(true)}
              variant="outline"
              size="icon-lg"
              className="flex lg:hidden"
              aria-label="Open navigation menu"
              aria-expanded={open}
            >
              <MenuIcon />
            </Button>
          </div>
        </div>

        {/* Mobile Menu - AnimatePresence keeps it mounted for fade-out */}
        {open && <MobileMenu user={user} setOpen={setOpen} />}
      </nav>
    </div>
  )
}

export const MobileMenu = ({
  user,
  setOpen,
}: {
  user?: T_User
  setOpen: (open: boolean) => void
}) => {
  const [menuState, setMenuState] = useState<MenuState>('default')
  const [direction, setDirection] = useState<NavigationDirection>(1)
  const shouldReduceMotion = useReducedMotion()

  const closeMenu = () => setOpen(false)

  const navigateForward = (state: 'products' | 'solutions') => {
    setDirection(1)
    setMenuState(state)
  }

  const navigateBack = () => {
    setDirection(-1)
    setMenuState('default')
  }

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [setOpen])

  return (
    <div className="bg-background fixed inset-0 z-20 flex h-dvh w-full flex-col overflow-hidden border-x-2 border-dashed lg:hidden">
      {/* Fixed Header */}
      <div className="flex h-14.75 shrink-0 items-center justify-between border-b-2 border-dashed px-5">
        <Link to="/" onClick={closeMenu} className="flex items-center gap-2">
          <img src="/logo.svg" className="size-8" alt="Pathlens" />
          <p className="text-2xl font-bold">Pathlens</p>
        </Link>

        <Button
          onClick={closeMenu}
          variant="outline"
          size="icon-lg"
          aria-label="Close navigation menu"
        >
          <XIcon />
        </Button>
      </div>

      {/* Animated Center - Takes Remaining Space */}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <AnimatePresence initial={false} custom={direction} mode="sync">
          <motion.div
            key={menuState}
            custom={direction}
            variants={
              shouldReduceMotion
                ? {
                    enter: { opacity: 0 },
                    center: { opacity: 1 },
                    exit: { opacity: 0 },
                  }
                : screenVariants
            }
            initial="enter"
            animate="center"
            exit="exit"
            transition={
              shouldReduceMotion ? { duration: 0.15 } : screenTransition
            }
            className="bg-background absolute inset-0 overflow-y-auto overscroll-contain"
            style={{
              willChange: 'transform, opacity',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {menuState === 'default' && (
              <div className="p-5">
                <button
                  type="button"
                  onClick={() => navigateForward('products')}
                  className="group flex w-full cursor-pointer items-center justify-between border-b py-5 text-left"
                >
                  <p className="group-hover:text-primary text-xl font-medium duration-200">
                    Products
                  </p>

                  <ChevronRightIcon className="group-hover:text-primary text-muted-foreground size-6 duration-200" />
                </button>

                <button
                  type="button"
                  onClick={() => navigateForward('solutions')}
                  className="group flex w-full cursor-pointer items-center justify-between border-b py-5 text-left"
                >
                  <p className="group-hover:text-primary text-xl font-medium duration-200">
                    Solutions
                  </p>

                  <ChevronRightIcon className="group-hover:text-primary text-muted-foreground size-6 duration-200" />
                </button>

                <Link
                  to="/docs"
                  onClick={closeMenu}
                  className="group flex w-full cursor-pointer items-center justify-between border-b py-5"
                >
                  <p className="group-hover:text-primary text-xl font-medium duration-200">
                    Docs
                  </p>
                </Link>

                <Link
                  to="/pricing"
                  onClick={closeMenu}
                  className="group flex w-full cursor-pointer items-center justify-between py-5"
                >
                  <p className="group-hover:text-primary text-xl font-medium duration-200">
                    Pricing
                  </p>
                </Link>
              </div>
            )}

            {menuState === 'products' && (
              <MobileSection
                title="Products"
                sections={productSections}
                basePath="/products"
                onBack={navigateBack}
                onNavigate={closeMenu}
              />
            )}

            {menuState === 'solutions' && (
              <MobileSection
                title="Solutions"
                sections={solutionSections}
                basePath="/solutions"
                onBack={navigateBack}
                onNavigate={closeMenu}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Fixed Footer */}
      <div className="flex w-full shrink-0 flex-col gap-2 border-t-2 border-dashed p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        {user ? (
          <>
            <Link to="/app" onClick={closeMenu}>
              <Button className="w-full" size="lg">
                Dashboard
              </Button>
            </Link>

            <Button
              onClick={() => {
                localStorage.removeItem('pathlens-token')
                window.location.reload()
              }}
              className="w-full"
              variant={'destructive'}
              size="lg"
            >
              Logout
            </Button>
          </>
        ) : (
          <>
            <Link to="/login" onClick={closeMenu}>
              <Button className="w-full" size="lg" variant="outline">
                Log in
              </Button>
            </Link>

            <Link to="/sign-up" onClick={closeMenu}>
              <Button className="w-full" size="lg">
                Sign up
              </Button>
            </Link>
          </>
        )}
      </div>
    </div>
  )
}

type MenuSection = {
  title: string
  items: {
    title: string
    description: string
    icon: React.ElementType
  }[]
}

const MobileSection = ({
  title,
  sections,
  basePath,
  onBack,
  onNavigate,
}: {
  title: string
  sections: readonly MenuSection[]
  basePath: string
  onBack: () => void
  onNavigate: () => void
}) => {
  return (
    <div className="p-5 pt-0">
      {/* Sticky Submenu Navigation */}
      <div className="bg-background sticky top-0 z-10 flex items-center justify-between gap-2 py-5">
        <Button variant="link" className="px-0" onClick={onBack}>
          <ArrowLeftIcon />
          Back
        </Button>

        <a
          href={basePath}
          onClick={onNavigate}
          className="text-primary inline-flex items-center gap-1 text-sm font-medium hover:underline"
        >
          See all {title}
          <ArrowRightIcon className="size-4 -rotate-45" />
        </a>
      </div>

      {/* Section Items */}
      <div className="space-y-4">
        {sections.map((section) => (
          <div key={section.title} className="space-y-2">
            <p className="text-muted-foreground text-sm font-medium">
              {section.title}
            </p>

            <div>
              {section.items.map((item) => {
                const itemId = createSlug(item.title)

                return (
                  <a
                    key={item.title}
                    href={`${basePath}/${itemId}`}
                    onClick={onNavigate}
                    className="group flex w-full cursor-pointer items-start gap-4 rounded-md py-2"
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
                  </a>
                )
              })}
            </div>
          </div>
        ))}
      </div>
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
                    key={item.title}
                    onClick={(e) => e.stopPropagation()}
                    render={
                      <a
                        onClick={(e) => e.stopPropagation()}
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
          className="p-0 hover:bg-transparent"
          render={<a onClick={(e) => e.stopPropagation()} href="/products" />}
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
    <>
      <div className="bg-background grid w-4xl grid-cols-3 divide-x self-center rounded-md border">
        {solutionSections.slice(0, 4).map((section) => (
          <div key={section.title} className="space-y-2 p-2">
            <p className="text-muted-foreground pt-2 pl-2 text-sm">
              {section.title}
            </p>

            <div className="flex flex-col space-y-2">
              {section.items.map((item) => {
                const solutionId = createSlug(item.title)

                return (
                  <NavigationMenuLink
                    key={item.title}
                    onClick={(e) => e.stopPropagation()}
                    render={
                      <a
                        href={`/solutions/${solutionId}`}
                        onClick={(e) => e.stopPropagation()}
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
          className="p-0 hover:bg-transparent"
          render={<a onClick={(e) => e.stopPropagation()} href="/solutions" />}
        >
          <Button variant="link" size="sm" className="text-primary">
            See all Solutions
            <ArrowRightIcon />
          </Button>
        </NavigationMenuLink>
      </div>
    </>
  )
}
