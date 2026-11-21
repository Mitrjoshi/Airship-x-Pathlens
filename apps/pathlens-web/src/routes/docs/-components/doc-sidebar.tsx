import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@workspace/ui/components/sidebar'
import { Link, useLocation } from '@tanstack/react-router'
import { Button } from '@workspace/ui/components/button'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@workspace/ui/components/input-group'
import { SearchIcon } from 'lucide-react'
import { ModKey } from '@/hooks/use-modifier-key'

const navigation = [
  {
    title: 'Getting Started',
    items: [
      { label: 'Introduction', href: '/docs/guides' },
      { label: 'Installation', href: '/docs/guides/installation' },
    ],
  },
  {
    title: 'Tracking',
    items: [
      { label: 'How Tracking Works', href: '/docs/guides/tracking' },
      { label: 'Configuration', href: '/docs/guides/configuration' },
      { label: 'Custom Events', href: '/docs/guides/custom-events' },
      { label: 'Privacy & Data Collection', href: '/docs/guides/privacy' },
    ],
  },
  {
    title: 'Analytics',
    items: [
      { label: 'Overview', href: '/docs/guides/analytics' },
      { label: 'Visitor Analytics', href: '/docs/guides/visitor-analytics' },
      { label: 'Session Replay', href: '/docs/guides/session-replay' },
      { label: 'Heatmaps', href: '/docs/guides/heatmaps' },
    ],
  },
  {
    title: 'Resources',
    items: [
      { label: 'Troubleshooting', href: '/docs/guides/troubleshooting' },
      { label: 'FAQs', href: '/docs/guides/faq' },
      { label: 'Changelog', href: '/docs/guides/changelog' },
    ],
  },
]

export const DocSidebar = () => {
  const { pathname } = useLocation()

  return (
    <Sidebar className="pt-14.75">
      <SidebarHeader className="bg-background border-b">
        <InputGroup className="w-full">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput placeholder="Search documentation..." />
          <InputGroupText className="mr-2">
            <kbd className="flex items-center gap-px">
              <ModKey />
              <span className="text-xs">+K</span>
            </kbd>
          </InputGroupText>
        </InputGroup>
      </SidebarHeader>
      <SidebarContent className="bg-background">
        {navigation.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>

            <SidebarMenu>
              {group.items.map((item) => {
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={
                        <Button
                          className={'justify-start px-0'}
                          variant={
                            pathname === item.href ? 'secondary' : 'ghost'
                          }
                          render={
                            <Link to={item.href}>
                              <span>{item.label}</span>
                            </Link>
                          }
                        ></Button>
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
