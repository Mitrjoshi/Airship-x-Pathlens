import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { consumeGoogleState, getGoogleState } from '@/lib/google-auth'
import { Button } from '@workspace/ui/components/button'

export const Route = createFileRoute('/(auth)/google-callback')({
  component: GoogleCallback,
})

function GoogleCallback() {
  const navigate = useNavigate()
  const params = new URLSearchParams(window.location.search)
  const returnedState = params.get('state')
  const expectedState = getGoogleState()
  const token = new URLSearchParams(window.location.hash.slice(1)).get('token')
  const error =
    params.get('error') ??
    (!returnedState || returnedState !== expectedState || !token
      ? 'Unable to complete Google login. Please try again.'
      : null)

  useEffect(() => {
    consumeGoogleState()
    if (error || !token) return

    localStorage.setItem('pathlens-token', token)
    window.history.replaceState({}, document.title, '/google-callback')
    navigate({ to: '/app', replace: true })
  }, [error, navigate, token])

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      {error ? (
        <div className="flex flex-col items-center justify-center gap-2">
          <p className="text-destructive font-semibold">{error}</p>
          <Button render={<Link to="/login" />} variant={'outline'}>
            Back to Login
          </Button>
        </div>
      ) : (
        <p className="text-muted-foreground shimmer font-semibold">
          {'Completing Google login...'}
        </p>
      )}
    </div>
  )
}
