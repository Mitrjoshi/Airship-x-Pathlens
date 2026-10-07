import { useState } from 'react'
import { getProjectDomainsOptions } from '@/queries/domains'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import {
  InputGroup,
  InputGroupButton,
  InputGroupInput,
} from '@workspace/ui/components/input-group'
import { Skeleton } from '@workspace/ui/components/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table'
import {
  EllipsisIcon,
  ExternalLinkIcon,
  PlusIcon,
  SearchIcon,
} from 'lucide-react'
import { UserDetailsSheet } from './-components/user/user-details-sheet'
import { Button } from '@workspace/ui/components/button'
import {
  useCreateProjectDomain,
  useDeleteProjectDomain,
  useUpdateProjectDomain,
} from '@/mutations/domains'
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
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'
import { LoadingSwap } from '@workspace/ui/components/loading-swap'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'
import ApiKeyLoading from './-components/common/api-key-loading'
import { Badge } from '@workspace/ui/components/badge'

export const Route = createFileRoute('/app/$workspaceId/$projectId/domains')({
  component: RouteComponent,
})

function RouteComponent() {
  const { projectId, workspaceId } = Route.useParams()

  const [domain, setDomain] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)

  const { data, isLoading } = useQuery(getProjectDomainsOptions(projectId))

  const { mutate: createDomain, isPending: isCreating } =
    useCreateProjectDomain(projectId)

  const handleCreateDomain = () => {
    const value = domain.trim()

    if (!value) return

    createDomain(value, {
      onSuccess: () => {
        setDomain('')
        setDialogOpen(false)
      },
    })
  }

  if (isLoading) {
    return <ApiKeyLoading />
  }

  return (
    <div className="p-6">
      <div className="space-y-5">
        {/* Header */}
        <div>
          <p className="text-xl font-medium">Domains</p>

          <p className="text-muted-foreground text-sm">
            Manage the domains where Pathlens is installed and collecting
            analytics.
          </p>
        </div>

        {/* Search + Create */}
        <div className="flex items-center justify-between gap-4">
          <InputGroup className="w-120">
            <InputGroupButton>
              <SearchIcon />
            </InputGroupButton>

            <InputGroupInput placeholder="Search..." />
          </InputGroup>

          <Dialog
            open={dialogOpen}
            onOpenChange={(open) => {
              setDialogOpen(open)

              if (!open) {
                setDomain('')
              }
            }}
          >
            <DialogTrigger render={<Button />}>
              <PlusIcon />
              New Domain
            </DialogTrigger>

            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Domain</DialogTitle>

                <DialogDescription>
                  Add a domain where Pathlens will be installed and collect
                  analytics.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-2 py-2">
                <Label htmlFor="create-domain">Domain</Label>

                <Input
                  id="create-domain"
                  value={domain}
                  onChange={(event) => setDomain(event.target.value)}
                  placeholder="example.com"
                  disabled={isCreating}
                  autoFocus
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      handleCreateDomain()
                    }
                  }}
                />
              </div>

              <DialogFooter>
                <DialogClose
                  render={<Button variant="outline" disabled={isCreating} />}
                >
                  Cancel
                </DialogClose>

                <Button
                  onClick={handleCreateDomain}
                  disabled={!domain.trim() || isCreating}
                >
                  <LoadingSwap isLoading={isCreating}>Add Domain</LoadingSwap>
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Table */}
        <div className="border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Domain</TableHead>

                <TableHead className="w-60 text-center">Created By</TableHead>

                <TableHead className="w-20 text-center">Action</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {isLoading
                ? [...Array(10)].map((_, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Skeleton className="h-5 w-32" />
                      </TableCell>

                      <TableCell>
                        <Skeleton className="mx-auto h-5 w-60" />
                      </TableCell>

                      <TableCell>
                        <Skeleton className="mx-auto h-5 w-8" />
                      </TableCell>
                    </TableRow>
                  ))
                : data?.data?.map((item) => (
                    <TableRow key={item.id} className="hover:bg-card/40">
                      <TableCell>
                        <Button
                          render={
                            <a href={item.domain as string} target="_blank" />
                          }
                          variant="link"
                          className="text-foreground px-0 underline underline-offset-4"
                        >
                          {item.domain}
                          <ExternalLinkIcon />
                        </Button>
                        {item.isDefault && (
                          <Badge variant={'secondary'} className="ml-4">
                            Default
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell className="text-center">
                        <UserDetailsSheet
                          userId={item.userId}
                          workspaceId={workspaceId}
                        />
                      </TableCell>

                      <TableCell className="text-center">
                        <DomainActions
                          projectId={projectId}
                          domainId={item.id}
                          domain={item.domain}
                        />
                      </TableCell>
                    </TableRow>
                  ))}

              {!isLoading && !data?.data?.length && (
                <TableRow>
                  <TableCell colSpan={3} className="h-32 text-center">
                    <p className="text-muted-foreground text-sm">
                      No domains found.
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}

type DomainActionsProps = {
  projectId: string
  domainId: string
  domain: string
}

function DomainActions({ projectId, domainId, domain }: DomainActionsProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button size="icon" variant="outline" />}>
          <EllipsisIcon />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            Edit
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditDomainDialog
        projectId={projectId}
        domainId={domainId}
        domain={domain}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      <DeleteDomainDialog
        projectId={projectId}
        domainId={domainId}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </>
  )
}

type EditDomainDialogProps = {
  projectId: string
  domainId: string
  domain: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

function EditDomainDialog({
  projectId,
  domainId,
  domain,
  open,
  onOpenChange,
}: EditDomainDialogProps) {
  const [value, setValue] = useState(domain)

  const { mutate: updateDomain, isPending: isUpdating } =
    useUpdateProjectDomain(projectId)

  const handleUpdate = () => {
    const updatedDomain = value.trim()

    if (!updatedDomain) return

    updateDomain(
      {
        domainId,
        domain: updatedDomain,
      },
      {
        onSuccess: () => {
          onOpenChange(false)
        },
      }
    )
  }

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen)

    // Reset back to the original domain when closed
    if (!nextOpen) {
      setValue(domain)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Domain</DialogTitle>

          <DialogDescription>
            Update the domain where Pathlens is installed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor={`edit-domain-${domainId}`}>Domain</Label>

          <Input
            id={`edit-domain-${domainId}`}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="example.com"
            disabled={isUpdating}
            autoFocus
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                handleUpdate()
              }
            }}
          />
        </div>

        <DialogFooter>
          <DialogClose
            render={<Button variant="outline" disabled={isUpdating} />}
          >
            Cancel
          </DialogClose>

          <Button
            onClick={handleUpdate}
            disabled={!value.trim() || value.trim() === domain || isUpdating}
          >
            <LoadingSwap isLoading={isUpdating}>Save Changes</LoadingSwap>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

type DeleteDomainDialogProps = {
  projectId: string
  domainId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

function DeleteDomainDialog({
  projectId,
  domainId,
  open,
  onOpenChange,
}: DeleteDomainDialogProps) {
  const { mutate: deleteDomain, isPending: isDeleting } =
    useDeleteProjectDomain(projectId)

  const handleDelete = () => {
    deleteDomain(domainId, {
      onSuccess: () => {
        onOpenChange(false)
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Domain</DialogTitle>

          <DialogDescription>
            Are you sure you want to delete this domain? This action cannot be
            undone.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <DialogClose
            render={<Button variant="outline" disabled={isDeleting} />}
          >
            Cancel
          </DialogClose>

          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            <LoadingSwap isLoading={isDeleting}>Delete Domain</LoadingSwap>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
