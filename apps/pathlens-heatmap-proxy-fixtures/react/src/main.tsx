import { lazy, Suspense, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

const storageProbe = (() => {
  const localInitial = localStorage.getItem('pathlens-fixture-local')
  const sessionInitial = sessionStorage.getItem('pathlens-fixture-session')
  localStorage.setItem('pathlens-fixture-local', 'temporary-local')
  sessionStorage.setItem('pathlens-fixture-session', 'temporary-session')
  return { localInitial, sessionInitial }
})()

function currentRoute() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`
}

function ImageCard({ src }: { src: string }) {
  return <img data-testid="destructured-image" src={src} alt="Destructured" />
}

const LazyPanel = lazy(() => import('./lazy-panel'))
const logoAsset = '/logo.svg'
const skillImages = [
  { title: 'React', image: '/skills/reactjs.svg' },
  { title: 'TypeScript', image: '/skills/typescript.svg' },
  { title: 'JavaScript', image: '/skills/javascript.svg' },
]

function App() {
  const [count, setCount] = useState(0)
  const [apiValue, setApiValue] = useState('waiting')
  const [visible, setVisible] = useState(false)
  const [route, setRoute] = useState(currentRoute)

  useEffect(() => {
    const onPopState = () => setRoute(currentRoute())
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  function navigate(nextRoute: string) {
    window.history.pushState({}, '', nextRoute)
    setRoute(currentRoute())
  }

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) setVisible(true)
    })
    const target = document.querySelector('#observed')
    if (target) observer.observe(target)
    void fetch('/api/fixture.json')
      .then((response) => response.json() as Promise<{ value: string }>)
      .then((data) => setApiValue(data.value))
    const runtimeImage = new Image()
    runtimeImage.alt = 'Runtime image'
    runtimeImage.dataset.testid = 'runtime-image'
    runtimeImage.src = '/logo.svg'
    document.querySelector('#runtime-images')?.append(runtimeImage)
    const dynamicPicture = document.createElement('picture')
    const dynamicSource = document.createElement('source')
    const dynamicSrcset =
      '/images/banner,wide.webp 1x, /images/banner@2x.webp 2x'
    dynamicSource.dataset.testid = 'dynamic-source'
    dynamicSource.srcset = dynamicSrcset
    const dynamicImage = document.createElement('img')
    dynamicImage.alt = 'Dynamic picture image'
    dynamicImage.src = '/logo.svg'
    dynamicPicture.append(dynamicSource, dynamicImage)
    document.querySelector('#runtime-images')?.append(dynamicPicture)
    return () => observer.disconnect()
  }, [])

  return (
    <main>
      <header className="sticky">React + Vite production fixture</header>
      <section className="hero">
        <img src={logoAsset} alt="Fixture logo" width="96" height="96" />
        <ImageCard src={logoAsset} />
        <picture>
          <source srcSet="/logo.svg 1x" media="(min-width: 1px)" />
          <img src="/logo.svg" alt="Picture logo" width="48" height="48" />
        </picture>
        <img
          src={logoAsset}
          alt="Lazy logo"
          width="48"
          height="48"
          loading="lazy"
          data-testid="lazy-image"
        />
        <div className="image-background" data-testid="background-image" />
        <div data-testid="data-images">
          {skillImages.map((skill) => (
            <img key={skill.title} src={skill.image} alt={skill.title} />
          ))}
        </div>
        <div id="runtime-images" />
        <h1>React mounted</h1>
        <p data-testid="api">API: {apiValue}</p>
        <p data-testid="storage">
          Storage: {storageProbe.localInitial ?? 'empty'}/
          {storageProbe.sessionInitial ?? 'empty'}
        </p>
        <nav aria-label="Fixture routes">
          <button
            data-testid="route-contact"
            onClick={() => navigate('/contact?tab=details#section')}
          >
            Contact route
          </button>
          <button
            data-testid="route-unauthorized"
            onClick={() => navigate('/other')}
          >
            Unauthorized route
          </button>
          <button
            data-testid="route-cross-domain"
            onClick={() => navigate('https://evil.example.test/')}
          >
            Cross-domain route
          </button>
        </nav>
        <p
          data-testid="route"
          data-active={route.startsWith('/contact') ? 'contact' : 'other'}
        >
          Route: {route}
        </p>
        <button
          data-testid="count"
          onClick={() => setCount((value) => value + 1)}
        >
          Count: {count}
        </button>
      </section>
      <Suspense fallback={<p data-testid="lazy">Loading lazy component...</p>}>
        <LazyPanel />
      </Suspense>
      <section id="observed" className="observed">
        {visible ? (
          <p data-testid="intersection">
            IntersectionObserver revealed content.
          </p>
        ) : (
          'Scroll to reveal'
        )}
      </section>
      <div className="spacer" />
    </main>
  )
}

createRoot(document.getElementById('root')!).render(<App />)
