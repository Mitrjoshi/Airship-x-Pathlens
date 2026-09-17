import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/app/$workspace/projects/')({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: '/app/$workspace',
      params: { workspace: params.workspace },
    })
  },
})
