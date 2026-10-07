import { Skeleton } from '@workspace/ui/components/skeleton'

export default function ApiKeyLoading() {
  return (
    <div className="h-screen">
      <div className="mx-auto space-y-4 p-6">
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
