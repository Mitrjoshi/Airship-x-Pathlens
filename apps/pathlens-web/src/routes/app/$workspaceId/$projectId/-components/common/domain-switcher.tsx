import type { T_ProjectDomain } from '@/queries/domains'
import { Link } from '@tanstack/react-router'
import { Button } from '@workspace/ui/components/button'
import { ButtonGroup } from '@workspace/ui/components/button-group'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@workspace/ui/components/input-group'
import { Skeleton } from '@workspace/ui/components/skeleton'
import {
  CheckIcon,
  ChevronsUpDownIcon,
  LinkIcon,
  PlusIcon,
  SearchIcon,
  XIcon,
} from 'lucide-react'

interface I_Props {
  loading: boolean
  domain: string
  setDomain: (val: string) => void
  domains: T_ProjectDomain[]
  refetch: () => void
  includeAll?: boolean
}

export const DomainSwitcher = ({
  loading,
  domain,
  setDomain,
  domains,
  refetch,
  includeAll = false,
}: I_Props) => {
  return (
    <ButtonGroup>
      <Button
        disabled={loading}
        render={<a href={domain as string} target="_blank" />}
        variant={'outline'}
        className={'text-foreground'}
      >
        <LinkIcon className="text-muted-foreground mr-1 size-4" />
        {loading ? (
          <Skeleton className="h-5 w-40" />
        ) : (
          domain || (includeAll ? 'All domains' : domain)
        )}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button disabled={loading} variant={'outline'} />}
        >
          <ChevronsUpDownIcon />
        </DropdownMenuTrigger>

        <DropdownMenuContent sideOffset={8} className={'w-fit'} align="end">
          <DropdownMenuGroup>
            <InputGroup>
              <InputGroupAddon>
                <SearchIcon />
              </InputGroupAddon>
              <InputGroupInput placeholder="Search..." />
              <InputGroupButton>
                <XIcon />
              </InputGroupButton>
            </InputGroup>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup className={'h-40 overflow-auto'}>
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
            {includeAll && (
              <DropdownMenuItem
                render={
                  <Button
                    className={'w-full justify-between text-left'}
                    variant={domain === '' ? 'secondary' : 'ghost'}
                    onClick={() => {
                      setDomain('')
                      refetch()
                    }}
                  />
                }
              >
                All domains
                <CheckIcon
                  className={`${domain === '' ? 'opacity-100' : 'opacity-0'} ml-7`}
                />
              </DropdownMenuItem>
            )}
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            render={
              <Button
                render={
                  <Link
                    to="/app/$workspaceId/$projectId/domains"
                    search={{ create: true }}
                  />
                }
                variant="ghost"
                className={'w-full justify-start'}
              />
            }
          >
            <PlusIcon />
            Create Domain
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </ButtonGroup>
  )
}
