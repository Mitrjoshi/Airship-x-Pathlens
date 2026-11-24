import {
  createFileRoute,
  Link,
  Outlet,
  useLocation,
} from '@tanstack/react-router'
import { AnimatePresence, motion } from 'motion/react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from '@workspace/ui/components/sidebar'
import { Button } from '@workspace/ui/components/button'
import { ArrowUpRightIcon, SidebarIcon } from 'lucide-react'
import { SearchOverAppDialog } from '@/components/common/search-over-app-dialog'
import { Header } from '../-components/header'
import { Separator } from '@workspace/ui/components/separator'
import { navigationIcons } from '@/config/navigation-icons'
import { NotFound } from '@/components/common/not-found'

export const Route = createFileRoute('/app/(entry)')({
  component: RouteComponent,
  notFoundComponent: () => <NotFound />,
})

function RouteComponent() {
  return (
    <>
      <SidebarProvider>
        <EntrySidebar />
        <SidebarInset>
          <Header />
          <Outlet />
        </SidebarInset>
      </SidebarProvider>
    </>
  )
}

export const EntrySidebar = () => {
  const { pathname } = useLocation()

  const sidebarGeneralItems = [
    {
      label: 'General',
      items: [
        {
          label: 'Workspaces',
          icon: navigationIcons.workspaces,
          to: '/app',
          isActive: pathname === '/app',
          external: false,
        },
        {
          label: 'Usage',
          icon: navigationIcons.usage,
          to: '/app/usage',
          isActive: pathname === '/app/usage',
          external: false,
        },
        {
          label: 'Notifications',
          icon: navigationIcons.notifications,
          to: '/app/notifications',
          isActive: pathname === '/app/notifications',
          external: false,
        },
      ],
    },
    {
      label: 'Account',
      items: [
        {
          label: 'Account Settings',
          icon: navigationIcons.accountSettings,
          to: '/app/settings',
          isActive: pathname === '/app/settings',
          external: false,
        },
        {
          label: 'Billing',
          icon: navigationIcons.billing,
          to: '/app/billing',
          isActive: pathname === '/app/billing',
          external: false,
        },
      ],
    },
    {
      label: 'Resources',
      items: [
        {
          label: 'Docs',
          icon: navigationIcons.documentation,
          to: '/docs',
          isActive: false,
          external: true,
        },
        {
          label: 'Terms of Service',
          icon: navigationIcons.terms,
          to: '/terms',
          isActive: false,
          external: true,
        },
        {
          label: 'Privacy',
          icon: navigationIcons.privacy,
          to: '/terms',
          isActive: false,
          external: true,
        },
      ],
    },
  ]

  return (
    <>
      <Sidebar>
        <SidebarHeader className="bg-background flex h-14.25 flex-row items-center border-b py-2">
          <Link to="/app" className="flex h-12 w-40 items-center gap-2">
            <div className="">
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

            {/* <p className="text-2xl font-semibold">Pathlens</p> */}
          </Link>
        </SidebarHeader>
        <SidebarContent className="bg-background">
          <SidebarGroup>
            <SearchOverAppDialog />
          </SidebarGroup>

          <Separator />

          <SidebarGroup>
            <AnimatePresence mode="wait">
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{
                  duration: 0.18,
                  ease: 'easeOut',
                }}
              >
                <motion.div className="space-y-2">
                  {sidebarGeneralItems.map((label, index) => {
                    return (
                      <div className="pb-2">
                        <SidebarGroupLabel key={index}>
                          {label.label}
                        </SidebarGroupLabel>

                        {label.items.map((item, index) => {
                          const Icon = item.icon

                          return (
                            <>
                              <div key={item.label}>
                                <div className="relative h-8 overflow-hidden rounded-md">
                                  {/* Temporary loading background */}
                                  <motion.div
                                    className="bg-muted/20 absolute inset-0 mb-1 rounded-md"
                                    initial={{ opacity: 1 }}
                                    animate={{ opacity: 0 }}
                                    transition={{
                                      duration: 0.2,
                                      delay: index * 0.01,
                                    }}
                                  />

                                  {/* Actual sidebar item */}
                                  <motion.div
                                    initial={{
                                      opacity: 0,
                                      y: 3,
                                    }}
                                    animate={{
                                      opacity: 1,
                                      y: 0,
                                    }}
                                    transition={{
                                      duration: 0.18,
                                      delay: index * 0.01,
                                      ease: 'easeOut',
                                    }}
                                  >
                                    <SidebarMenuItem>
                                      <SidebarMenuButton
                                        render={
                                          <Button
                                            className="justify-start"
                                            variant={
                                              item.isActive
                                                ? 'secondary'
                                                : 'ghost'
                                            }
                                            render={
                                              <Link
                                                target={
                                                  item.external ? '_blank' : ''
                                                }
                                                to={item.to}
                                              />
                                            }
                                          />
                                        }
                                      >
                                        <Icon />
                                        {item.label}
                                        {item.external && (
                                          <ArrowUpRightIcon className="text-muted-foreground ml-auto" />
                                        )}
                                      </SidebarMenuButton>
                                    </SidebarMenuItem>
                                  </motion.div>
                                </div>
                              </div>
                            </>
                          )
                        })}
                      </div>
                    )
                  })}
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="bg-background border-t">
          <SidebarTrigger>
            <Button variant="ghost" size="icon">
              <SidebarIcon />
            </Button>
          </SidebarTrigger>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
    </>
  )
}
