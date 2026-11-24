import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@workspace/ui/components/avatar'
import { Button } from '@workspace/ui/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'
import { Link } from '@tanstack/react-router'
import { ArrowUpRightIcon, MonitorIcon, SunIcon, MoonIcon } from 'lucide-react'
import { useTheme } from '@/components/common/theme-provider'
import { motion, useMotionValue, useTransform, animate } from 'motion/react'
import { useEffect } from 'react'
import { Badge } from '@workspace/ui/components/badge'
import type { T_User } from '@/queries/user'

export function NavUser({ user }: { user: T_User }) {
  const { theme, setTheme } = useTheme()

  const progress = useMotionValue(0)

  const background = useTransform(
    progress,
    (value) =>
      `conic-gradient(var(--primary) ${value}%, var(--muted) ${value}%)`
  )

  useEffect(() => {
    const controls = animate(
      progress,
      Math.min(100, Math.max(0, user?.usagePercentage ?? 0)),
      {
        duration: 1,
        ease: 'easeInOut',
      }
    )

    return () => controls.stop()
  }, [user?.usagePercentage, progress])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button size="icon" className={'rounded-full'} variant="ghost" />
        }
      >
        <motion.div
          className="aspect-square size-8 rounded-full p-[2px]"
          style={{ background }}
        >
          <Avatar className="bg-background size-full rounded-full p-[3px]">
            <AvatarImage
              src={user?.avatar ?? undefined}
              alt={user?.name ?? 'User'}
              className="rounded-full object-cover"
            />
            <AvatarFallback className="bg-primary/40 text-black dark:text-white">
              {user?.name?.charAt(0)}
            </AvatarFallback>
          </Avatar>
        </motion.div>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-50"
        side="bottom"
        align="end"
        sideOffset={8}
      >
        <DropdownMenuGroup>
          <div className="space-y--2 px-1 py-1.5 text-left text-sm">
            <div className="flex w-full items-center justify-between">
              <p className="truncate font-medium">{user?.name}</p>

              <Badge
                className="scale-90"
                variant={user.lifetimeAccess ? 'default' : 'outline'}
              >
                {user.lifetimeAccess ? 'Unlimited' : 'Free'}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-px truncate text-xs">
              {user?.email}
            </p>
          </div>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup className={'space-y-1'}>
          <DropdownMenuItem
            render={
              <Button
                className={'flex w-full cursor-pointer justify-between'}
                variant="ghost"
                render={<Link to="/app/settings" />}
              />
            }
          >
            Account Settings
          </DropdownMenuItem>

          <DropdownMenuItem
            render={
              <Button
                className={
                  'flex w-full cursor-pointer items-center justify-between'
                }
                variant="ghost"
                render={<Link to="/app/usage" />}
              />
            }
          >
            Usage{' '}
            <span
              className="text-[13px]"
              style={{
                color: `hsl(${120 - Math.min(100, Math.max(0, user.usagePercentage)) * 1.2}, 75%, 42%)`,
              }}
            >
              {user.usagePercentage.toFixed(1)}%
            </span>
          </DropdownMenuItem>

          <DropdownMenuItem
            render={
              <Button
                className={'flex w-full cursor-pointer justify-between'}
                variant="ghost"
                render={<Link to="/app/billing" />}
              />
            }
          >
            Subscription
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuGroup className={'flex items-center justify-between'}>
            <DropdownMenuLabel className={'text-foreground text-sm'}>
              Theme
            </DropdownMenuLabel>

            <div className="flex items-center gap-px rounded-lg border p-0.5">
              <Button
                size="icon-sm"
                onClick={() => setTheme('light')}
                variant={theme == 'light' ? 'outline' : 'ghost'}
              >
                <SunIcon
                  className={`${theme == 'light' ? 'text-foreground' : 'text-muted-foreground'} duration-200`}
                />
              </Button>
              <Button
                size="icon-sm"
                onClick={() => setTheme('dark')}
                variant={theme == 'dark' ? 'outline' : 'ghost'}
              >
                <MoonIcon
                  className={`${theme == 'dark' ? 'text-foreground' : 'text-muted-foreground'} duration-200`}
                />
              </Button>
              <Button
                size="icon-sm"
                onClick={() => setTheme('system')}
                variant={theme == 'system' ? 'outline' : 'ghost'}
              >
                <MonitorIcon
                  className={`${theme == 'system' ? 'text-foreground' : 'text-muted-foreground'} duration-200`}
                />
              </Button>
            </div>
          </DropdownMenuGroup>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger
              render={<Button variant="ghost" className={'w-full'} />}
            >
              Resources
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent className={'w-40'} sideOffset={10}>
                <DropdownMenuItem
                  render={
                    <Button
                      className={'flex w-full cursor-pointer justify-between'}
                      variant="ghost"
                      render={<Link to="/docs" target="_blank" />}
                    />
                  }
                >
                  Docs
                  <ArrowUpRightIcon />
                </DropdownMenuItem>
                <DropdownMenuItem
                  render={
                    <Button
                      className={'flex w-full cursor-pointer justify-between'}
                      variant="ghost"
                      render={<Link to="/terms" target="_blank" />}
                    />
                  }
                >
                  Terms
                  <ArrowUpRightIcon />
                </DropdownMenuItem>
                <DropdownMenuItem
                  render={
                    <Button
                      className={'flex w-full cursor-pointer justify-between'}
                      variant="ghost"
                      render={<Link to="/privacy" target="_blank" />}
                    />
                  }
                >
                  Privacy Policy
                  <ArrowUpRightIcon />
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          render={
            <Button
              className={
                'text-destructive flex w-full cursor-pointer justify-between'
              }
              variant="ghost"
            />
          }
          onClick={() => {
            localStorage.removeItem('pathlens-token')
            window.location.reload()
          }}
        >
          Log out
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <div className="p-1">
          <p className="text-muted-foreground text-xs font-medium">
            Pathlens v{__APP_VERSION__}
          </p>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
