import { Skeleton } from '@workspace/ui/components/skeleton'

export default function ProjectLoading() {
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
        <div>
          <p className="text-xl font-medium">Dashboard</p>
          <p className="text-muted-foreground text-sm">
            Get a quick overview of your project activity and performance.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-30 w-full rounded-none" />
          <Skeleton className="h-30 w-full rounded-none" />
          <Skeleton className="h-30 w-full rounded-none" />
        </div>

        <div className="grid grid-cols-[25%_75%] gap-3">
          <Skeleton className="h-90 w-full rounded-none" />
          <Skeleton className="h-full w-full rounded-none" />
        </div>

        <div className="grid grid-cols-4 gap-3">
          <Skeleton className="h-60 w-full rounded-none" />
          <Skeleton className="h-60 w-full rounded-none" />
          <Skeleton className="h-60 w-full rounded-none" />
          <Skeleton className="h-60 w-full rounded-none" />
        </div>
      </div>
    </div>
  )
}
