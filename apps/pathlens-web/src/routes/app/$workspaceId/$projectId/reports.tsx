import { useGenerateReport } from '@/mutations/reports'
import { getProjectDomainsOptions } from '@/queries/domains'
import {
  getReportGenerationsOptions,
  type ReportDevice,
  type ReportRange,
  type ReportType,
} from '@/queries/reports'
import {
  capitalizeFirstLetter,
  formatBytes,
  formatDate,
  getPaginationItems,
} from '@/utils/utils'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@workspace/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@workspace/ui/components/dialog'
import { Skeleton } from '@workspace/ui/components/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table'
import { PlusIcon } from 'lucide-react'
import { useState } from 'react'
import { UserDetailsSheet } from './-components/user/user-details-sheet'
import { Field, FieldGroup, FieldLabel } from '@workspace/ui/components/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { LoadingSwap } from '@workspace/ui/components/loading-swap'

const PAGE_SIZE = 10

export const Route = createFileRoute('/app/$workspaceId/$projectId/reports')({
  component: RouteComponent,
})

const rangeLabels = [
  { value: '24h', label: 'Last 24 hours' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
]

const deviceLabels = [
  { value: 'all', label: 'All devices' },
  { value: 'desktop', label: 'Desktop' },
  { value: 'mobile', label: 'Mobile' },
  { value: 'tablet', label: 'Tablet' },
  { value: 'unknown', label: 'Unknown' },
]

const reportTypes = [
  { label: 'Full Report', value: 'full' },
  { label: 'Overview', value: 'overview' },
  { label: 'Traffic', value: 'traffic' },
  { label: 'Pages', value: 'pages' },
  { label: 'Devices', value: 'devices' },
  { label: 'Referrers', value: 'referrers' },
  { label: 'Countries', value: 'countries' },
  { label: 'Browsers', value: 'browsers' },
]

function RouteComponent() {
  const { workspaceId, projectId } = Route.useParams()

  const [page, setPage] = useState(1)
  const [domain, setDomain] = useState('all')
  const [reportType, setReportType] = useState<ReportType>('full')
  const [range, setRange] = useState<ReportRange>('7d')
  const [device, setDevice] = useState<ReportDevice>('all')
  const [open, setOpen] = useState(false)

  const { data: reportsData, isLoading: reportsLoading } = useQuery(
    getReportGenerationsOptions({
      workspace_id: workspaceId,
      project_id: projectId,
      page,
      page_size: PAGE_SIZE,
    })
  )

  const { data: domainsData, isLoading: domainsLoading } = useQuery(
    getProjectDomainsOptions(projectId)
  )

  const { mutate, isPending } = useGenerateReport()

  const reports = reportsData?.data
  const domains = domainsData?.data

  const totalReports = reportsData?.pagination.total ?? 0
  const totalPages = Math.ceil(totalReports / PAGE_SIZE)
  const paginationItems = getPaginationItems(page, totalPages)

  const from = totalReports === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const to = Math.min(page * PAGE_SIZE, totalReports)

  const domainsItems = [
    {
      label: 'All Domains',
      value: 'all',
    },
    ...(domains?.map((item) => ({
      label: item.domain,
      value: item.domain,
    })) ?? []),
  ]

  return (
    <div>
      <div className="mx-auto space-y-6 p-6">
        {/* Heading */}
        <div className="flex items-center justify-between gap-6">
          <div className="space-y-1">
            <p className="text-xl font-medium">Reports</p>

            <p className="text-muted-foreground text-sm">
              View and analyze reports generated across your project.
            </p>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button disabled={domainsLoading} />}>
              <PlusIcon />
              Generate Report
            </DialogTrigger>

            <DialogContent>
              <DialogHeader>
                <DialogTitle>Generate Report</DialogTitle>
              </DialogHeader>

              <FieldGroup>
                <Field>
                  <FieldLabel>Report Type</FieldLabel>
                  <Select
                    items={reportTypes}
                    value={reportType}
                    onValueChange={(value) => {
                      setReportType(value ?? 'full')
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent alignItemWithTrigger={false}>
                      {reportTypes?.map((item, index) => (
                        <SelectItem key={index} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>Range</FieldLabel>
                  <Select
                    items={rangeLabels}
                    value={range}
                    onValueChange={(value) => {
                      if (value) setRange(value as ReportRange)
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent alignItemWithTrigger={false}>
                      {rangeLabels.map((range) => (
                        <SelectItem key={range.value} value={range.value}>
                          {range.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>Domain</FieldLabel>
                  <Select
                    items={domainsItems}
                    value={domain}
                    onValueChange={(value) => {
                      if (value) setDomain(value ?? 'all')
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent alignItemWithTrigger={false}>
                      {domainsItems.map((range) => (
                        <SelectItem key={range.value} value={range.value}>
                          {range.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>Device</FieldLabel>
                  <Select
                    items={deviceLabels}
                    value={device}
                    onValueChange={(value) => {
                      if (value) {
                        setDevice(value as ReportDevice)
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent alignItemWithTrigger={false}>
                      {deviceLabels.map((device) => (
                        <SelectItem key={device.value} value={device.value}>
                          {device.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </FieldGroup>

              <DialogFooter>
                <Button
                  onClick={() => {
                    mutate(
                      {
                        workspace_id: workspaceId,
                        project_id: projectId,
                        device,
                        range,
                        report_type: reportType,
                        domain,
                      },
                      {
                        onSuccess: () => {
                          setOpen(false)
                        },
                      }
                    )
                  }}
                >
                  <LoadingSwap isLoading={isPending}>Generate</LoadingSwap>
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="overflow-hidden">
          <div className="overflow-hidden border">
            <Table>
              <TableHeader>
                <TableRow className="w-full justify-between">
                  <TableHead>Report Type</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead>Range</TableHead>
                  <TableHead>File Size</TableHead>
                  <TableHead>Generated By</TableHead>
                  <TableHead>Generated At</TableHead>
                  <TableHead className="w-30">File</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {reportsLoading ? (
                  [...Array(5)].map((_, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Skeleton className="h-6 w-full" />
                      </TableCell>

                      <TableCell>
                        <Skeleton className="h-6 w-full" />
                      </TableCell>

                      <TableCell>
                        <Skeleton className="h-6 w-full" />
                      </TableCell>

                      <TableCell>
                        <Skeleton className="h-6 w-full" />
                      </TableCell>

                      <TableCell>
                        <Skeleton className="h-6 w-full" />
                      </TableCell>

                      <TableCell>
                        <Skeleton className="h-6 w-full" />
                      </TableCell>

                      <TableCell>
                        <Skeleton className="h-6 w-full" />
                      </TableCell>

                      <TableCell>
                        <Skeleton className="h-6 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : !reports?.length ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center">
                      <p className="text-muted-foreground text-sm">
                        No reports generated yet.
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  reports?.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        {capitalizeFirstLetter(item.reportType)}
                      </TableCell>
                      <TableCell className="w-40">
                        {capitalizeFirstLetter(item.filters.device)}
                      </TableCell>
                      <TableCell className="w-40">
                        {item.filters.domain || 'All'}
                      </TableCell>
                      <TableCell className="w-40">
                        {item.filters.range}
                      </TableCell>

                      <TableCell className="w-40">
                        {formatBytes(item.fileSize!)}
                      </TableCell>

                      <TableCell className="w-64">
                        <UserDetailsSheet
                          userId={item.actorUserId}
                          workspaceId={workspaceId}
                        />
                      </TableCell>

                      <TableCell className="w-40">
                        {formatDate(item.createdAt)}
                      </TableCell>

                      <TableCell>
                        <Button variant={'outline'}>Download</Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Pagination */}
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-muted-foreground text-sm">
                {totalReports > 0 ? (
                  <>
                    Showing {from}-{to} of {totalReports} events
                  </>
                ) : (
                  'No reports generated'
                )}
              </p>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || reportsLoading}
                  onClick={() => {
                    setPage((current) => Math.max(current - 1, 1))
                  }}
                >
                  Previous
                </Button>

                <div className="flex items-center gap-1">
                  {paginationItems.map((item, index) => {
                    if (item === 'ellipsis') {
                      return (
                        <span
                          key={`ellipsis-${index}`}
                          className="text-muted-foreground flex size-8 items-center justify-center text-sm"
                        >
                          ...
                        </span>
                      )
                    }

                    return (
                      <Button
                        key={item}
                        variant={page === item ? 'outline' : 'ghost'}
                        size="icon"
                        className="size-8"
                        disabled={reportsLoading}
                        onClick={() => {
                          setPage(item)
                        }}
                      >
                        {item}
                      </Button>
                    )
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages || reportsLoading}
                  onClick={() => {
                    setPage((current) => Math.min(current + 1, totalPages))
                  }}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
