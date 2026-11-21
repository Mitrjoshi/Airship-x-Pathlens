const googleStateKey = 'pathlens-google-oauth-state'
const googleRedirectKey = 'pathlens-google-oauth-redirect'

export function startGoogleLogin(redirect?: string) {
  const state = crypto.randomUUID()
  const apiUrl = import.meta.env.VITE_API_BASE_URL.replace(/\/$/, '')

  sessionStorage.setItem(googleStateKey, state)
  if (redirect) {
    sessionStorage.setItem(googleRedirectKey, redirect)
  } else {
    sessionStorage.removeItem(googleRedirectKey)
  }
  localStorage.setItem('pathlens-last-sign-in-method', 'google')
  const redirectQuery = redirect
    ? `&redirect=${encodeURIComponent(redirect)}`
    : ''
  window.location.assign(
    `${apiUrl}/auth/google?state=${encodeURIComponent(state)}${redirectQuery}`
  )
}

export function getGoogleState() {
  return sessionStorage.getItem(googleStateKey)
}

export function consumeGoogleState() {
  const state = sessionStorage.getItem(googleStateKey)
  sessionStorage.removeItem(googleStateKey)
  return state
}

export function consumeGoogleRedirect() {
  const redirect = sessionStorage.getItem(googleRedirectKey)
  sessionStorage.removeItem(googleRedirectKey)
  return redirect
}
