import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { consumeGoogleState, getGoogleState } from '@/lib/google-auth'

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
      <p className="text-muted-foreground text-sm">
        {error ?? 'Completing Google login...'}
      </p>
    </div>
  )
}
