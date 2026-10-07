import { Skeleton } from '@workspace/ui/components/skeleton'

export default function GoalsLoading() {
  return (
    <div className="h-screen">
      <div className="mx-auto space-y-4 p-6">
        <div className="grid grid-cols-4 gap-4">
          <Skeleton className="h-40 w-full rounded-none" />
          <Skeleton className="h-40 w-full rounded-none" />
          <Skeleton className="h-40 w-full rounded-none" />
          <Skeleton className="h-40 w-full rounded-none" />
          <Skeleton className="h-40 w-full rounded-none" />
          <Skeleton className="h-40 w-full rounded-none" />
          <Skeleton className="h-40 w-full rounded-none" />
          <Skeleton className="h-40 w-full rounded-none" />
        </div>
      </div>
    </div>
  )
}
