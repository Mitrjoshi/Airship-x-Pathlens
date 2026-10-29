import { Button } from '@workspace/ui/components/button'

export const ErrorScreen = ({ refetch }: { refetch: () => void }) => {
  return (
    <div className="flex items-center justify-center pt-50">
      <div className="flex flex-col items-center justify-center space-y-1">
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
          variant="outline"
          className={'mt-2'}
          onClick={() => refetch()}
        >
          Try again
        </Button>
      </div>
    </div>
  )
}
