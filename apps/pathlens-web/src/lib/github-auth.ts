const githubStateKey = 'pathlens-github-oauth-state'
const githubRedirectKey = 'pathlens-github-oauth-redirect'

export function startGithubLogin(redirect?: string) {
  const state = crypto.randomUUID()
  const apiUrl = import.meta.env.VITE_API_BASE_URL.replace(/\/$/, '')

  sessionStorage.setItem(githubStateKey, state)
  if (redirect) {
    sessionStorage.setItem(githubRedirectKey, redirect)
  } else {
    sessionStorage.removeItem(githubRedirectKey)
  }
  const redirectQuery = redirect
    ? `&redirect=${encodeURIComponent(redirect)}`
    : ''
  window.location.assign(
    `${apiUrl}/auth/github?state=${encodeURIComponent(state)}${redirectQuery}`
  )
}

export function getGithubState() {
  localStorage.setItem('pathlens-last-sign-in-method', 'github')
  return sessionStorage.getItem(githubStateKey)
}

export function consumeGithubState() {
  const state = sessionStorage.getItem(githubStateKey)
  sessionStorage.removeItem(githubStateKey)
  return state
}

export function consumeGithubRedirect() {
  const redirect = sessionStorage.getItem(githubRedirectKey)
  sessionStorage.removeItem(githubRedirectKey)
  return redirect
}
