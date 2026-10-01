const githubStateKey = 'pathlens-github-oauth-state'

export function startGithubLogin() {
  const state = crypto.randomUUID()
  const apiUrl = import.meta.env.VITE_API_BASE_URL.replace(/\/$/, '')

  sessionStorage.setItem(githubStateKey, state)
  window.location.assign(
    `${apiUrl}/auth/github?state=${encodeURIComponent(state)}`
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
