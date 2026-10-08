import type { T_ProjectDomain } from '@/queries/domains'
import { Button } from '@workspace/ui/components/button'
import { ButtonGroup } from '@workspace/ui/components/button-group'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { CheckIcon, ChevronsUpDownIcon, LinkIcon } from 'lucide-react'

interface I_Props {
  loading: boolean
  domain: string
  setDomain: (val: string) => void
  domains: T_ProjectDomain[]
  refetch: () => void
}

export const DomainSwitcher = ({
  loading,
  domain,
  setDomain,
  domains,
  refetch,
}: I_Props) => {
  return (
    <ButtonGroup>
      <Button
        disabled={loading}
        render={<a href={domain as string} target="_blank" />}
        variant={'outline'}
        className={'text-foreground'}
      >
        <LinkIcon className="mr-1" />
        {loading ? <Skeleton className="h-5 w-50" /> : domain}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button disabled={loading} variant={'outline'} />}
        >
          <ChevronsUpDownIcon />
        </DropdownMenuTrigger>

        <DropdownMenuContent className={'w-fit'} align="center">
          <DropdownMenuGroup>
            {domains?.map((item, index) => (
              <DropdownMenuItem
                onClick={() => setDomain(item.domain)}
                key={index}
                render={
                  <Button
                    className={'w-full justify-between text-left'}
                    variant={domain === item.domain ? 'secondary' : 'ghost'}
                    onClick={() => refetch()}
                  />
                }
              >
                {item.domain}

                <CheckIcon
                  className={`${domain === item.domain ? 'opacity-100' : 'opacity-0'} ml-7`}
                />
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </ButtonGroup>
  )
}
