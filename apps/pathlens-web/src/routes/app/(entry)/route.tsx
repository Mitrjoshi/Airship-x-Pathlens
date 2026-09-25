import {
  createFileRoute,
  Link,
  Outlet,
  useLocation,
} from '@tanstack/react-router'
import { motion } from 'motion/react'
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
          <div className="px-5">
            <Outlet />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </>
  )
}

const sidebarGeneralItems = [
  {
    label: 'Workspaces',
    icon: navigationIcons.workspaces,
    to: '/app',
    isActive: (pathname: string) => pathname === '/app',
  },
  {
    label: 'Billing',
    icon: navigationIcons.billing,
    to: '/app/billing',
    isActive: (pathname: string) => pathname === '/app/billing',
  },
  {
    label: 'Account Settings',
    icon: navigationIcons.accountSettings,
    to: '/app/settings',
    isActive: (pathname: string) => pathname === '/app/settings',
  },
]
export const EntrySidebar = () => {
  const { pathname } = useLocation()

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
            <SidebarGroupLabel>General</SidebarGroupLabel>

            <motion.div>
              {sidebarGeneralItems.map((item, index) => {
                const Icon = item.icon
                const active = item.isActive(pathname)

                return (
                  <motion.div
                    key={item.label}
                    className="relative h-8 overflow-hidden rounded-md"
                    initial="loading"
                    animate="loaded"
                    variants={{
                      loading: {},
                      loaded: {},
                    }}
                  >
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

                    {/* Actual item */}
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
                        duration: 0.2,
                        delay: index * 0.01,

                        ease: 'easeOut',
                      }}
                    >
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          render={
                            <Button
                              className="justify-start"
                              variant={active ? 'secondary' : 'ghost'}
                              render={<Link to={item.to} />}
                            />
                          }
                        >
                          <Icon />
                          {item.label}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </motion.div>
                  </motion.div>
                )
              })}
            </motion.div>
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
