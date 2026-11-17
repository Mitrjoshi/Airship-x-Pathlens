import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@workspace/ui/components/sidebar'
import { Link, useLocation } from '@tanstack/react-router'
import { Button } from '@workspace/ui/components/button'

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
    <Sidebar>
      <SidebarContent className="bg-background pt-14.75">
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
