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
import { SidebarIcon } from 'lucide-react'
import { SearchOverAppDialog } from '@/components/common/search-over-app-dialog'
import { Header } from '../-components/header'
import { Separator } from '@workspace/ui/components/separator'
import { navigationIcons } from '@/config/navigation-icons'

export const Route = createFileRoute('/app/(entry)')({
  component: RouteComponent,
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
        },
        {
          label: 'Usage',
          icon: navigationIcons.usage,
          to: '/app/usage',
          isActive: pathname === '/app/usage',
        },
        {
          label: 'Notifications',
          icon: navigationIcons.notifications,
          to: '/app/notifications',
          isActive: pathname === '/app/notifications',
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
        },
        {
          label: 'Billing',
          icon: navigationIcons.billing,
          to: '/app/billing',
          isActive: pathname === '/app/billing',
        },
        {
          label: 'Sessions & Security',
          icon: navigationIcons.security,
          to: '/app/security',
          isActive: pathname === '/app/security',
        },
      ],
    },
  ]

  return (
    <>
      <Sidebar>
        <SidebarHeader className="bg-background border-b py-2">
          <Link to="/app" className="flex items-center">
            <img
              src="/logo.png"
              className="size-10 dark:invert"
              alt="Pathlens"
            />

            <p className="text-2xl font-bold">Pathlens</p>
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
                                            render={<Link to={item.to} />}
                                          />
                                        }
                                      >
                                        <Icon />
                                        {item.label}
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
