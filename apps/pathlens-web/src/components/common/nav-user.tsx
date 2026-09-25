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
import { BadgeCheckIcon, CheckIcon, DollarSign, LogOutIcon } from 'lucide-react'
import { useTheme } from '@/components/common/theme-provider'

export interface NavUserData {
  name: string
  email: string
  avatar: string | null
}

export function NavUser({ user }: { user: NavUserData }) {
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button size="icon" className={''} variant="ghost" />}
      >
        <Avatar>
          <AvatarImage
            className={''}
            src={user.avatar ?? undefined}
            alt={user.name}
          />
          <AvatarFallback
            className={'bg-primary/40 text-black dark:text-white'}
          >
            {user.name.charAt(0)}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="my-2 w-50"
        side="bottom"
        align="end"
        sideOffset={4}
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="p-0 font-normal">
            <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="text-foreground truncate font-medium">
                  {user.name}
                </span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup className={'space-y-1'}>
          <DropdownMenuItem
            render={
              <Button
                className={'flex w-full cursor-pointer justify-between'}
                variant="ghost"
              />
            }
          >
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem
            render={
              <Button
                className={'flex w-full cursor-pointer justify-between'}
                variant="ghost"
              />
            }
          >
            Billing
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuGroup>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger
              render={<Button variant="ghost" className={'w-full'} />}
            >
              Appearance
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent className={'w-32'} sideOffset={10}>
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
