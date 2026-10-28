import { Button } from '@workspace/ui/components/button'
import { LockKeyhole } from 'lucide-react'

type NoPermissionViewProps = {
  title?: string
  description?: string
}

export const NoPermissionView = ({
  title = 'Permission required',
  description = "You don't have permission to view this page.",
}: NoPermissionViewProps) => {
  return (
    <div className="border-destructive bg-destructive/5 flex items-start justify-between border-2 border-dashed px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="bg-destructive/10 text-destructive flex size-9 shrink-0 items-center justify-center">
          <LockKeyhole className="size-4" />
        </div>

        <div>
          <p className="font-medium">{title}</p>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>
      </div>

      <Button variant={'link'} className={'text-foreground'}>
        Request permission
      </Button>
    </div>
  )
}
