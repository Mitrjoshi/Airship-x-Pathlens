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
import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowUpRightIcon, CheckIcon } from 'lucide-react'
import { useTheme } from '@/components/common/theme-provider'
import { motion, useMotionValue, useTransform, animate } from 'motion/react'
import { useEffect } from 'react'
import { Progress } from '@workspace/ui/components/progress'

export interface NavUserData {
  name: string
  email: string
  avatar: string | null
  usagePercentage: number
}

export function NavUser({ user }: { user: NavUserData }) {
  const navigate = useNavigate()
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
            <p className="truncate font-medium">{user?.name}</p>
            <p className="text-muted-foreground truncate text-xs">
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
            Settings
          </DropdownMenuItem>

          <DropdownMenuItem
            render={
              <Button
                className={'flex w-full cursor-pointer justify-between'}
                variant="ghost"
                render={<Link to="/app/usage" />}
              />
            }
          >
            Usage
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

          <DropdownMenuSub>
            <DropdownMenuSubTrigger
              render={<Button variant="ghost" className={'w-full'} />}
            >
              Theme
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent className={'w-40'} sideOffset={10}>
                <DropdownMenuItem
                  render={
                    <Button
                      className={'flex w-full cursor-pointer justify-between'}
                      variant="ghost"
                    />
                  }
                  onClick={() => setTheme('light')}
                >
                  Light
                  {theme === 'light' && <CheckIcon />}
                </DropdownMenuItem>
                <DropdownMenuItem
                  render={
                    <Button
                      className={'flex w-full cursor-pointer justify-between'}
                      variant="ghost"
                    />
                  }
                  onClick={() => setTheme('dark')}
                >
                  Dark
                  {theme === 'dark' && <CheckIcon />}
                </DropdownMenuItem>
                <DropdownMenuItem
                  render={
                    <Button
                      className={'flex w-full cursor-pointer justify-between'}
                      variant="ghost"
                    />
                  }
                  onClick={() => setTheme('system')}
                >
                  System
                  {theme === 'system' && <CheckIcon />}
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger
              render={<Button variant="ghost" className={'w-full'} />}
            >
              Terms and Privacy
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent className={'w-40'} sideOffset={10}>
                <DropdownMenuItem
                  render={
                    <Button
                      className={'flex w-full cursor-pointer justify-between'}
                      variant="ghost"
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
            navigate({ to: '/login', replace: true })
          }}
        >
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
