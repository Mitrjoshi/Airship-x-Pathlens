import { createFileRoute, Link } from '@tanstack/react-router'
import {
  SiReact,
  SiNextdotjs,
  SiVuedotjs,
  SiNuxt,
  SiAngular,
  SiSvelte,
  SiAstro,
  SiJavascript,
} from 'react-icons/si'

export const Route = createFileRoute('/docs/guides/')({
  component: RouteComponent,
})

const columns = 3

function RouteComponent() {
  const frameworks = [
    {
      title: 'React',
      description: 'Integrate Pathlens into your React application.',
      icon: SiReact,
    },
    {
      title: 'Next.js',
      description: 'Set up Pathlens with the App Router or Pages Router.',
      icon: SiNextdotjs,
    },
    {
      title: 'Vue',
      description: 'Add Pathlens tracking to your Vue application.',
      icon: SiVuedotjs,
    },
    {
      title: 'Nuxt',
      description: 'Integrate Pathlens into your Nuxt application.',
      icon: SiNuxt,
    },
    {
      title: 'Angular',
      description: 'Configure Pathlens tracking in Angular applications.',
      icon: SiAngular,
    },
    {
      title: 'Svelte',
      description: 'Add Pathlens analytics to your Svelte application.',
      icon: SiSvelte,
    },
    {
      title: 'Astro',
      description: 'Integrate Pathlens into your Astro website.',
      icon: SiAstro,
    },
    {
      title: 'JavaScript',
      description: 'Install Pathlens on any website using vanilla JavaScript.',
      icon: SiJavascript,
    },
  ]

  return (
    <div className="mx-auto max-w-[75%] space-y-12 p-10">
      <div className="space-y-2">
        <p className="text-muted-foreground text-sm font-light">
          Updated Nov 17, 2026
        </p>
        <p className="text-3xl font-medium md:text-4xl">Getting Started</p>
      </div>

      <div className="space-y-4">
        <p className="text-xl font-medium md:text-2xl">Frameworks Guide</p>
        <div className="border-border grid grid-cols-1 border-t-2 border-l-2 border-dashed sm:grid-cols-2 lg:grid-cols-3">
          {frameworks.map((item, index) => {
            const isFirstRow = index < columns
            const isFirstColumn = index % columns === 0

            return (
              <Link to="/">
                <div
                  key={index}
                  className={`border-border group relative h-full cursor-pointer border-r-2 border-b-2 border-dashed p-4 ${
                    isFirstRow && isFirstColumn ? 'nut-top-left' : ''
                  } ${isFirstRow ? 'nut-top-right nut-bottom-left' : ''} ${
                    isFirstColumn ? 'nut-bottom-left nut-top-left' : ''
                  } nut-bottom-right`}
                >
                  {/* Animated top-left gradient */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
                  >
                    <div
                      className="absolute inset-0 origin-top-left scale-75 opacity-0 transition-[transform,opacity] duration-500 ease-out group-hover:scale-100 group-hover:opacity-100"
                      style={{
                        background:
                          'radial-gradient(ellipse at top left, color-mix(in srgb, var(--primary) 14%, transparent) 0%, color-mix(in srgb, var(--primary) 5%, transparent) 35%, transparent 70%)',
                      }}
                    />
                  </div>

                  <item.icon className="text-muted-foreground group-hover:text-primary size-6 duration-200" />

                  <p className="mt-4 font-medium">{item.title}</p>

                  <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
