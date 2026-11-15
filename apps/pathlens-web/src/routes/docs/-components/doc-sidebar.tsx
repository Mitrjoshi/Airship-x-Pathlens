import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from '@workspace/ui/components/sidebar'
import { Link } from '@tanstack/react-router'
import { BookOpen, Code2, Rocket, Settings } from 'lucide-react'

const navigation = [
  {
    title: 'Getting Started',
    items: [
      { label: 'Introduction', href: '/docs', icon: BookOpen },
      { label: 'Installation', href: '/docs/installation', icon: Rocket },
      { label: 'Quick Start', href: '/docs/quick-start', icon: Code2 },
    ],
  },
  {
    title: 'Resources',
    items: [
      { label: 'Configuration', href: '/docs/configuration', icon: Settings },
    ],
  },
]

export const DocSidebar = () => {
  return (
    <Sidebar>
      <SidebarHeader className="h-14 justify-center border-b px-4">
        <span className="font-semibold">Documentation</span>
      </SidebarHeader>

      <SidebarContent className="bg-background">
        {navigation.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>

            <SidebarMenu>
              {group.items.map((item) => {
                const Icon = item.icon

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={
                        <Link
                          to={item.href}
                          activeProps={{
                            className:
                              'bg-sidebar-accent text-sidebar-accent-foreground',
                          }}
                        >
                          <Icon />
                          <span>{item.label}</span>
                        </Link>
                      }
                    ></SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  )
}
