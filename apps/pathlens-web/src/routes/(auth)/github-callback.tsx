import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import {
  consumeGithubRedirect,
  consumeGithubState,
  getGithubState,
} from '@/lib/github-auth'
import { Button } from '@workspace/ui/components/button'

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
    const redirect = params.get('redirect') ?? consumeGithubRedirect()
    window.history.replaceState({}, document.title, '/github-callback')
    navigate({ to: redirect || '/app', replace: true })
  }, [error, navigate, token])

  return (
    <div className="bg-background fixed top-0 left-0 z-99 flex min-h-screen w-screen items-center justify-center p-6">
      {error ? (
        <div className="flex flex-col items-center justify-center gap-2">
          <p className="text-destructive font-semibold">{error}</p>
          <Button render={<Link to="/login" />} variant={'outline'}>
            Back to Login
          </Button>
        </div>
      ) : (
        <p className="text-muted-foreground shimmer font-semibold">
          {'Completing Github login...'}
        </p>
      )}
    </div>
  )
}
