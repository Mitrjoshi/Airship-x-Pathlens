import ClientPanel from './client-panel'

export default function Page() {
  return (
    <main>
      <header className="sticky">Next.js production fixture</header>
      <h1>Next SSR rendered</h1>
      <p data-testid="ssr">Server-rendered content is present.</p>
      <ClientPanel />
      <img
        src="/next-logo.svg"
        alt="Next fixture logo"
        width="96"
        height="96"
      />
      <section className="long-section">Scroll content</section>
    </main>
  )
}
