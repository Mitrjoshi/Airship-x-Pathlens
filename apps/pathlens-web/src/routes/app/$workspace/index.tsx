import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/app/$workspace/')({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: '/app/$workspace/projects',
      params: { workspace: params.workspace },
    })
  },
})
