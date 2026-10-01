import { createFileRoute, useRouteContext } from '@tanstack/react-router'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@workspace/ui/components/avatar'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'

export const Route = createFileRoute('/app/(entry)/settings')({
  component: RouteComponent,
})

function RouteComponent() {
  const user = useRouteContext({
    from: '/app',
    select: (context) => context.user,
  })

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-start gap-12">
        <Avatar className={'size-50'}>
          <AvatarImage src={user?.avatar} />
          <AvatarFallback>{user?.name?.charAt(0)}</AvatarFallback>
        </Avatar>

        <div className="flex-1 space-y-4">
          <Label className="flex-col items-start">
            Display Name
            <Input value={user?.name} />
          </Label>
          <Label className="flex-col items-start">
            Email
            <Input value={user?.email} />
          </Label>
        </div>
      </div>
    </div>
  )
}
