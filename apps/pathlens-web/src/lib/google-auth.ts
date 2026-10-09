const googleStateKey = 'pathlens-google-oauth-state'

export function startGoogleLogin() {
  const state = crypto.randomUUID()
  const apiUrl = import.meta.env.VITE_API_BASE_URL.replace(/\/$/, '')

  sessionStorage.setItem(googleStateKey, state)
  localStorage.setItem('pathlens-last-sign-in-method', 'google')
  window.location.assign(
    `${apiUrl}/auth/google?state=${encodeURIComponent(state)}`
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
