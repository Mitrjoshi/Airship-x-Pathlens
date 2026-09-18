import { Moon, Sun } from 'lucide-react'

import { Button } from '@workspace/ui/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'
import { useTheme } from '@/components/common/theme-provider'

export function ModeToggle() {
  const { setTheme, theme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="icon-lg">
            <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
            <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
            <span className="sr-only">Toggle theme</span>
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme('light')}>
          <span
            className={`bg-foreground h-1.5 w-1.5 rounded-full duration-200 ${theme === 'light' ? 'opacity-100' : 'opacity-0'}`}
          />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>
          <span
            className={`bg-foreground h-1.5 w-1.5 rounded-full duration-200 ${theme === 'dark' ? 'opacity-100' : 'opacity-0'}`}
          />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}>
          <span
            className={`bg-foreground h-1.5 w-1.5 rounded-full duration-200 ${theme === 'system' ? 'opacity-100' : 'opacity-0'}`}
          />
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
