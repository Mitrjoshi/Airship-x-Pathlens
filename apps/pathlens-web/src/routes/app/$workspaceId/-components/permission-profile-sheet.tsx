import { getWorkspacePermissionProfileOptions } from '@/queries/workspace'
import { useQuery } from '@tanstack/react-query'
import { PERMISSION_GROUPS } from '@workspace/contracts'
import { Button } from '@workspace/ui/components/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@workspace/ui/components/sheet'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { ArrowUpRightIcon, CheckIcon, XIcon } from 'lucide-react'

interface I_Props {
  workspace_id: string
  permission_id: string
}

export const PermissionProfileSheet = ({
  workspace_id,
  permission_id,
}: I_Props) => {
  const { data: permissionData, isLoading } = useQuery(
    getWorkspacePermissionProfileOptions(workspace_id, permission_id)
  )

  const permission = permissionData?.data

  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button className="text-foreground gap-1.5 px-0" variant="link" />
        }
      >
        {isLoading ? (
          <Skeleton className="h-5 w-20" />
        ) : (
          <>
            {permission?.name}
            <ArrowUpRightIcon className="size-4" />
          </>
        )}
      </SheetTrigger>

      <SheetContent className="max-w-3xl! gap-0">
        <SheetHeader className="border-b">
          <SheetTitle>{permission?.name}</SheetTitle>
          <SheetDescription>{permission?.description}</SheetDescription>
        </SheetHeader>

        <div className="space-y-8 overflow-auto p-5">
          {PERMISSION_GROUPS.map((group, index) => (
            <>
              <div key={index}>
                <p className="mb-2 font-medium">{group.label}</p>

                <div className="grid grid-cols-2 gap-2 divide-dashed">
                  {group.permissions.map((item) => (
                    <>
                      <div
                        data-disabled={
                          !permission?.permissions.includes(item.key)
                        }
                        className="bg-primary/5 flex items-start justify-between gap-4 border-2 border-dashed p-2 opacity-100 data-disabled:bg-transparent data-disabled:opacity-50"
                      >
                        <div>
                          <p>{item.label}</p>
                          <p className="text-muted-foreground text-xs">
                            {item.description}
                          </p>
                        </div>

                        {permission?.permissions.includes(item.key) ? (
                          <CheckIcon className="text-primary mt-1" size={16} />
                        ) : (
                          <XIcon className="text-destructive mt-1" size={16} />
                        )}
                      </div>
                    </>
                  ))}
                </div>
              </div>
            </>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}
