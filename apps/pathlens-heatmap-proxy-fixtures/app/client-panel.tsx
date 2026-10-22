'use client'

import { lazy, Suspense, useEffect, useState } from 'react'

const DynamicPanel = lazy(() => import('./dynamic-panel'))

export default function ClientPanel() {
  const [count, setCount] = useState(0)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setLoaded(true), 0)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <section>
      <button onClick={() => setCount((value) => value + 1)}>
        Next count: {count}
      </button>
      <p data-testid="hydrated">{loaded ? 'Client hydrated' : 'Hydrating'}</p>
      <Suspense fallback={<p>Loading dynamic panel...</p>}>
        <DynamicPanel />
      </Suspense>
    </section>
  )
}
