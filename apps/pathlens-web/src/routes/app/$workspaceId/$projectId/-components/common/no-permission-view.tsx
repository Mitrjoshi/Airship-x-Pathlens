import { Button } from '@workspace/ui/components/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@workspace/ui/components/dialog'
import { Field, FieldGroup, FieldLabel } from '@workspace/ui/components/field'
import { Textarea } from '@workspace/ui/components/textarea'
import { useCreatePermissionRequest } from '@/mutations/workspace'
import { getPermissionRequestStatusOptions } from '@/queries/workspace'
import type { Permission } from '@workspace/contracts'
import { useQuery } from '@tanstack/react-query'
import { ExternalLinkIcon, LockKeyhole } from 'lucide-react'
import { useState } from 'react'
import { LoadingSwap } from '@workspace/ui/components/loading-swap'

type NoPermissionViewProps = {
  workspaceId: string
  permission?: Permission
  title?: string
  description?: string
}

export const NoPermissionView = ({
  workspaceId,
  permission,
  title = 'Permission required',
  description = "You don't have permission to view this page.",
}: NoPermissionViewProps) => {
  const [reason, setReason] = useState('')
  const [open, setOpen] = useState(false)
  const { mutate: requestPermission, isPending: requestPermissionPending } =
    useCreatePermissionRequest(workspaceId)
  const requestStatusQuery = useQuery({
    ...getPermissionRequestStatusOptions(workspaceId, permission!),
    enabled: Boolean(permission?.endsWith('.view')),
  })
  const isPendingRequest = requestStatusQuery.data?.data.status === 'pending'

  const submitRequest = () => {
    if (!permission) return

    requestPermission(
      { permission, reason },
      {
        onSuccess: () => {
          setOpen(false)
          setReason('')
        },
      }
    )
  }

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

      {isPendingRequest ? (
        <p className="mt-2 text-xs">Request pending admin approval.</p>
      ) : permission?.endsWith('.view') && !requestStatusQuery.isPending ? (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger
            render={
              <Button variant={'link'} className={'text-foreground'}>
                Request access
                <ExternalLinkIcon />
              </Button>
            }
          />

          <DialogContent>
            <DialogHeader>
              <DialogTitle>Mention your reason</DialogTitle>
              <DialogDescription>
                Please mention your reason for requesting access.
              </DialogDescription>
            </DialogHeader>

            <div>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="reason">Mention your reason</FieldLabel>
                  <Textarea
                    className="max-h-40"
                    id="reason"
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder="I need access because..."
                    maxLength={1000}
                  />
                </Field>
              </FieldGroup>
            </div>

            <DialogFooter className="bg-transparent">
              <DialogClose
                render={<Button variant={'outline'}>Cancel</Button>}
              />
              <Button
                disabled={!reason.trim() || requestPermissionPending}
                onClick={submitRequest}
              >
                <LoadingSwap isLoading={requestPermissionPending}>
                  Request
                </LoadingSwap>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  )
}
