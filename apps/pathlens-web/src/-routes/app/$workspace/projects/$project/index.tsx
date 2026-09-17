import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/app/$workspace/projects/$project/')({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: '/app/$workspace/projects/$project/dashboard',
      params: {
        workspace: params.workspace,
        project: params.project,
      },
    })
  },
})
