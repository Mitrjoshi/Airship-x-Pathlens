import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

export const Route = createFileRoute('/app/(entry)/checkout')({
  component: RouteComponent,
  validateSearch: z.object({
    checkout: z.enum(['success', 'cancelled']).default('cancelled'),
  }),
})

function RouteComponent() {
  const { checkout } = Route.useSearch()

  return (
    <div>
      {checkout === 'success' &&
        'Your account is on its way to unlimited possibilities.'}

      {checkout === 'cancelled' &&
        'Your checkout session has been cancelled. Please try again.'}
    </div>
  )
}
