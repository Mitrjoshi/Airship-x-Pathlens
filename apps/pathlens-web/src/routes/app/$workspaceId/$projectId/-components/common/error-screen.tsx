import { Button } from '@workspace/ui/components/button'
import { CircleXIcon } from 'lucide-react'

export const ErrorScreen = ({ refetch }: { refetch: () => void }) => {
  return (
    <div className="flex h-[calc(100dvh-200px)] items-center justify-center">
      <div className="flex flex-col items-center justify-center space-y-1">
        <CircleXIcon size={40} className="text-destructive" />

        <div className="text-center">
          <p className="text-destructive text-lg font-medium">
            Something went wrong!
          </p>
          <p className="text-muted-foreground text-sm">
            We couldn't complete your request. Please try again.
          </p>
        </div>

        <Button
          type="button"
          variant="secondary"
          className={'mt-4'}
          onClick={() => refetch()}
        >
          Retry
        </Button>
      </div>
    </div>
  )
}
