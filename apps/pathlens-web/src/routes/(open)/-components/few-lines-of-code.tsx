import { useEffect, useState } from 'react'
import { codeToHtml } from 'shiki'
import { motion } from 'motion/react'
import { AnimatedWords } from '@/components/animated-words'

const TRACKER_SCRIPT_URL = import.meta.env.VITE_TRACKER_SCRIPT_URL

const integrations = [
  {
    id: 'html',
    label: 'HTML',
    filename: '/index.html',
    language: 'html',
    code: `<script
  src="${TRACKER_SCRIPT_URL}"
  data-project-id="your-project-id"
  defer
></script>`,
  },
  {
    id: 'react',
    label: 'React',
    filename: '/src/main.tsx',
    language: 'tsx',
    code: `import { useEffect } from 'react'

useEffect(() => {
  const script = document.createElement('script')

  script.src = '${TRACKER_SCRIPT_URL}'
  script.dataset.projectId = 'your-project-id'
  script.defer = true

  document.head.appendChild(script)

  return () => {
    document.head.removeChild(script)
  }
}, [])`,
  },
  {
    id: 'next',
    label: 'Next.js',
    filename: '/app/layout.tsx',
    language: 'tsx',
    code: `import Script from 'next/script'

<Script
  src="${TRACKER_SCRIPT_URL}"
  data-project-id="your-project-id"
  strategy="afterInteractive"
/>`,
  },
  {
    id: 'vue',
    label: 'Vue',
    filename: '/src/App.vue',
    language: 'vue',
    code: `<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  const script = document.createElement('script')

  script.src = '${TRACKER_SCRIPT_URL}'
  script.dataset.projectId = 'your-project-id'
  script.defer = true

  document.head.appendChild(script)
})
</script>`,
  },
  {
    id: 'nuxt',
    label: 'Nuxt',
    filename: '/nuxt.config.ts',
    language: 'ts',
    code: `export default defineNuxtConfig({
  app: {
    head: {
      script: [
        {
          src: '${TRACKER_SCRIPT_URL}',
          'data-project-id': 'your-project-id',
          defer: true,
        },
      ],
    },
  },
})`,
  },
  {
    id: 'angular',
    label: 'Angular',
    filename: '/src/index.html',
    language: 'html',
    code: `<script
  src="${TRACKER_SCRIPT_URL}"
  data-project-id="your-project-id"
  defer
></script>`,
  },
  {
    id: 'svelte',
    label: 'Svelte',
    filename: '/src/app.html',
    language: 'html',
    code: `<script
  src="${TRACKER_SCRIPT_URL}"
  data-project-id="your-project-id"
  defer
></script>`,
  },
  {
    id: 'astro',
    label: 'Astro',
    filename: '/src/layouts/Layout.astro',
    language: 'astro',
    code: `<script
  src="${TRACKER_SCRIPT_URL}"
  data-project-id="your-project-id"
></script>`,
  },
]

const CodeBlock = ({ code, language }: { code: string; language: string }) => {
  const [html, setHtml] = useState('')

  useEffect(() => {
    let mounted = true

    codeToHtml(code, {
      lang: language,
      theme: 'github-dark',
    }).then((result) => {
      if (mounted) {
        setHtml(result)
      }
    })

    return () => {
      mounted = false
    }
  }, [code, language])

  if (!html) {
    return (
      <pre className="overflow-x-auto p-6 text-sm leading-7">
        <code>{code}</code>
      </pre>
    )
  }

  return (
    <div
      className="pathlens-code overflow-x-auto p-6 text-sm leading-7"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

export const FewLinesOfCode = () => {
  const [activeIntegration, setActiveIntegration] = useState('html')

  const integration =
    integrations.find((item) => item.id === activeIntegration) ??
    integrations[0]

  return (
    <div className="space-y-12">
      <div className="mx-auto max-w-2xl space-y-4">
        <div>
          <p className="text-center text-4xl font-medium">
            A few lines of code.
          </p>
          <p className="mx-auto w-fit text-center text-4xl font-medium">
            Complete website
            <AnimatedWords
              extraWidth={32}
              words={[
                ' Analytics.',
                ' Insights.',
                ' Behavior.',
                ' Intelligence.',
              ]}
            />
          </p>
        </div>

        <p className="text-muted-foreground text-center">
          Add one lightweight script to your website and Pathlens starts
          capturing the activity that matters — visitors, sessions, clicks,
          scrolls, forms and more, all in one place.
        </p>
      </div>

      <div className="space-y-8">
        <div className="mx-auto flex w-fit items-center justify-center gap-1 rounded-full border p-1">
          {integrations.map((item) => {
            const isActive = activeIntegration === item.id

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveIntegration(item.id)}
                className="hover:bg-secondary relative cursor-pointer rounded-full px-4 py-2 duration-150"
              >
                {isActive && (
                  <motion.div
                    layoutId="active-integration-tab-pill"
                    className="bg-primary absolute inset-0 rounded-full"
                    transition={{
                      type: 'spring',
                      stiffness: 380,
                      damping: 30,
                    }}
                  />
                )}

                <span
                  className={`relative z-10 transition-colors duration-200 ${
                    isActive ? 'text-black' : 'text-muted-foreground'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            )
          })}
        </div>

        <div className="nut-all mx-auto max-w-2xl border-2 border-dashed">
          <div className="bg-muted/70 nut-bottom-left nut-bottom-right flex items-center gap-1 border-b-2 border-dashed px-4 py-3">
            <span className="size-3 rounded-full border-2 bg-red-400" />
            <span className="size-3 rounded-full border-2 bg-yellow-400" />
            <span className="size-3 rounded-full border-2 bg-green-400" />

            <span className="text-muted-foreground ml-2 text-xs">
              {integration.filename}
            </span>
          </div>

          <CodeBlock code={integration.code} language={integration.language} />
        </div>
      </div>
    </div>
  )
}
