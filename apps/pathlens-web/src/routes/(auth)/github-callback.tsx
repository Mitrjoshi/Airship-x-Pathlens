import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { consumeGithubState, getGithubState } from '@/lib/github-auth'

export const Route = createFileRoute('/(auth)/github-callback')({
  component: GithubCallback,
})

function GithubCallback() {
  const navigate = useNavigate()
  const params = new URLSearchParams(window.location.search)
  const returnedState = params.get('state')
  const expectedState = getGithubState()
  const token = new URLSearchParams(window.location.hash.slice(1)).get('token')
  const error =
    params.get('error') ??
    (!returnedState || returnedState !== expectedState || !token
      ? 'Unable to complete GitHub login. Please try again.'
      : null)

  useEffect(() => {
    consumeGithubState()
    if (error || !token) return

    localStorage.setItem('pathlens-token', token)
    window.history.replaceState({}, document.title, '/github-callback')
    navigate({ to: '/app', replace: true })
  }, [error, navigate, token])

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <p className="text-muted-foreground text-sm">
        {error ?? 'Completing GitHub login...'}
      </p>
    </div>
  )
}
