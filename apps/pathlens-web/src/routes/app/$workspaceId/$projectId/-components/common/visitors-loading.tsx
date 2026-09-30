import { Skeleton } from '@workspace/ui/components/skeleton'

export default function VisitorsLoading() {
  return (
    <div className="h-screen">
      <div className="flex items-center justify-between border-b p-4 py-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-20 rounded-none" />
          <Skeleton className="h-8 w-20 rounded-none" />
          <Skeleton className="h-8 w-20 rounded-none" />
        </div>

        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-20 rounded-none" />
          <Skeleton className="h-8 w-20 rounded-none" />
          <Skeleton className="h-8 w-20 rounded-none" />
        </div>
      </div>
      <div className="mx-auto space-y-4 p-6">
        <div className="">
          <Skeleton className="h-120 w-full rounded-none" />
        </div>

        <div className="space-y-2">
          <Skeleton className="h-8 w-full rounded-none" />
          <Skeleton className="h-8 w-full rounded-none" />
          <Skeleton className="h-8 w-full rounded-none" />
          <Skeleton className="h-8 w-full rounded-none" />
          <Skeleton className="h-8 w-full rounded-none" />
          <Skeleton className="h-8 w-full rounded-none" />
          <Skeleton className="h-8 w-full rounded-none" />
          <Skeleton className="h-8 w-full rounded-none" />
        </div>
      </div>
    </div>
  )
}
