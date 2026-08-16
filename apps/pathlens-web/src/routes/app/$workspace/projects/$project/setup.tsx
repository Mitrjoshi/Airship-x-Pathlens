import {
  ProjectPageHeader,
  ProjectPageLayout,
  ProjectPanel,
} from '@/components/common/project-page'
import { getProjectsOptions } from '@/queries/projects'
import { Button } from '@workspace/ui/components/button'
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { Input } from '@workspace/ui/components/input'
import { Skeleton } from '@workspace/ui/components/skeleton'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@workspace/ui/components/tabs'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import {
  ArrowRight,
  Check,
  CircleCheck,
  Code2,
  Copy,
  Globe2,
  KeyRound,
  ShieldCheck,
  Terminal,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

const TRACKER_SCRIPT_URL = 'http://localhost:3000/dist/tracker.global.js'
const PROJECT_KEY_TOKEN = '__PATHLENS_PROJECT_KEY__'
const TRACKER_URL_TOKEN = '__PATHLENS_TRACKER_URL__'
const CAPTURE_REPLAY_TOKEN = '__PATHLENS_CAPTURE_REPLAY__'
const CAPTURE_PERFORMANCE_TOKEN = '__PATHLENS_CAPTURE_PERFORMANCE__'
const CAPTURE_ERRORS_TOKEN = '__PATHLENS_CAPTURE_ERRORS__'

type FrameworkId = 'html' | 'react' | 'next' | 'vue' | 'angular' | 'svelte'

interface FrameworkSnippet {
  id: FrameworkId
  label: string
  language: string
  description: string
  template: string
}

const frameworkSnippets: FrameworkSnippet[] = [
  {
    id: 'html',
    label: 'Plain HTML',
    language: 'html',
    description: 'Paste this before the closing body tag on every page.',
    template: `<script
  defer
  src="${TRACKER_URL_TOKEN}"
  data-project-id="${PROJECT_KEY_TOKEN}"
  data-capture-replay="${CAPTURE_REPLAY_TOKEN}"
  data-capture-performance="${CAPTURE_PERFORMANCE_TOKEN}"
  data-capture-errors="${CAPTURE_ERRORS_TOKEN}"
></script>`,
  },
  {
    id: 'react',
    label: 'React',
    language: 'tsx',
    description: 'Render this component once near the root of your app.',
    template: `import { useEffect } from 'react'

export function PathlensTracker() {
  useEffect(() => {
    const script = document.createElement('script')
    script.src = '${TRACKER_URL_TOKEN}'
    script.async = true
    script.dataset.projectId = '${PROJECT_KEY_TOKEN}'
    script.dataset.captureReplay = '${CAPTURE_REPLAY_TOKEN}'
    script.dataset.capturePerformance = '${CAPTURE_PERFORMANCE_TOKEN}'
    script.dataset.captureErrors = '${CAPTURE_ERRORS_TOKEN}'
    document.head.appendChild(script)

    return () => script.remove()
  }, [])

  return null
}`,
  },
  {
    id: 'next',
    label: 'Next.js',
    language: 'tsx',
    description: 'Add this client component to your root layout.',
    template: `'use client'

import { useEffect } from 'react'

export function PathlensTracker() {
  useEffect(() => {
    const script = document.createElement('script')
    script.src = '${TRACKER_URL_TOKEN}'
    script.async = true
    script.dataset.projectId = '${PROJECT_KEY_TOKEN}'
    script.dataset.captureReplay = '${CAPTURE_REPLAY_TOKEN}'
    script.dataset.capturePerformance = '${CAPTURE_PERFORMANCE_TOKEN}'
    script.dataset.captureErrors = '${CAPTURE_ERRORS_TOKEN}'
    document.head.appendChild(script)

    return () => script.remove()
  }, [])

  return null
}`,
  },
  {
    id: 'vue',
    label: 'Vue',
    language: 'vue',
    description: 'Use this component once in your application shell.',
    template: `<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'

let script: HTMLScriptElement | undefined

onMounted(() => {
  script = document.createElement('script')
  script.src = '${TRACKER_URL_TOKEN}'
  script.async = true
  script.dataset.projectId = '${PROJECT_KEY_TOKEN}'
  script.dataset.captureReplay = '${CAPTURE_REPLAY_TOKEN}'
  script.dataset.capturePerformance = '${CAPTURE_PERFORMANCE_TOKEN}'
  script.dataset.captureErrors = '${CAPTURE_ERRORS_TOKEN}'
  document.head.appendChild(script)
})

onBeforeUnmount(() => script?.remove())
</script>

<template>
  <span aria-hidden="true" />
</template>`,
  },
  {
    id: 'angular',
    label: 'Angular',
    language: 'ts',
    description: 'Render this standalone component from your root component.',
    template: `import { AfterViewInit, Component, OnDestroy } from '@angular/core'

@Component({
  selector: 'app-pathlens-tracker',
  standalone: true,
  template: '',
})
export class PathlensTrackerComponent
  implements AfterViewInit, OnDestroy
{
  private script?: HTMLScriptElement

  ngAfterViewInit() {
    this.script = document.createElement('script')
    this.script.src = '${TRACKER_URL_TOKEN}'
    this.script.async = true
    this.script.dataset.projectId = '${PROJECT_KEY_TOKEN}'
    this.script.dataset.captureReplay = '${CAPTURE_REPLAY_TOKEN}'
    this.script.dataset.capturePerformance = '${CAPTURE_PERFORMANCE_TOKEN}'
    this.script.dataset.captureErrors = '${CAPTURE_ERRORS_TOKEN}'
    document.head.appendChild(this.script)
  }

  ngOnDestroy() {
    this.script?.remove()
  }
}`,
  },
  {
    id: 'svelte',
    label: 'Svelte',
    language: 'svelte',
    description: 'Mount this once from your root layout or app component.',
    template: `<script lang="ts">
  import { onMount } from 'svelte'

  onMount(() => {
    const script = document.createElement('script')
    script.src = '${TRACKER_URL_TOKEN}'
    script.async = true
    script.dataset.projectId = '${PROJECT_KEY_TOKEN}'
    script.dataset.captureReplay = '${CAPTURE_REPLAY_TOKEN}'
    script.dataset.capturePerformance = '${CAPTURE_PERFORMANCE_TOKEN}'
    script.dataset.captureErrors = '${CAPTURE_ERRORS_TOKEN}'
    document.head.appendChild(script)

    return () => script.remove()
  })
</script>`,
  },
]

function fillSnippet(
  template: string,
  projectKey: string,
  preferences: {
    captureReplay: boolean
    capturePerformance: boolean
    captureErrors: boolean
  }
): string {
  return template
    .replaceAll(PROJECT_KEY_TOKEN, () => projectKey)
    .replaceAll(TRACKER_URL_TOKEN, TRACKER_SCRIPT_URL)
    .replaceAll(CAPTURE_REPLAY_TOKEN, String(preferences.captureReplay))
    .replaceAll(
      CAPTURE_PERFORMANCE_TOKEN,
      String(preferences.capturePerformance)
    )
    .replaceAll(CAPTURE_ERRORS_TOKEN, String(preferences.captureErrors))
}

function CodeBlock({
  code,
  language,
  onCopy,
}: {
  code: string
  language: string
  onCopy: () => void
}) {
  return (
    <div className="overflow-hidden rounded-xl border bg-zinc-950 text-zinc-100">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
        <span className="text-xs font-medium text-zinc-400">{language}</span>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="text-zinc-300 hover:bg-white/10 hover:text-white"
          onClick={onCopy}
        >
          <Copy />
          Copy
        </Button>
      </div>
      <pre className="max-h-[30rem] overflow-auto p-4 text-xs leading-6 whitespace-pre-wrap sm:text-sm">
        <code>{code}</code>
      </pre>
    </div>
  )
}

export const Route = createFileRoute('/app/$workspace/projects/$project/setup')(
  {
    component: RouteComponent,
    staticData: {
      breadcrumb: 'Setup',
    },
  }
)

function RouteComponent() {
  const { workspace, project } = Route.useParams()
  const [copied, setCopied] = useState('')
  const { data, isError, isPending } = useQuery(
    getProjectsOptions({
      workspace_id: workspace,
      project_id: project,
    })
  )

  const projectData = data?.data[0]
  const projectKey = projectData?.apiKey ?? 'your-project-key'
  const trackingPreferences = {
    captureReplay: projectData?.captureReplay ?? true,
    capturePerformance: projectData?.capturePerformance ?? true,
    captureErrors: projectData?.captureErrors ?? false,
  }
  const snippets = frameworkSnippets.map((snippet) => ({
    ...snippet,
    code: fillSnippet(snippet.template, projectKey, trackingPreferences),
  }))

  const copyText = async (value: string, label: string) => {
    if (!projectData?.apiKey) {
      toast.error('The project key is still loading.')
      return
    }

    try {
      await navigator.clipboard.writeText(value)
      setCopied(label)
      toast.success(`${label} copied to clipboard`)
      window.setTimeout(() => setCopied(''), 1500)
    } catch {
      toast.error('Unable to copy. Select the text and copy it manually.')
    }
  }

  return (
    <ProjectPageLayout>
      <div className="mx-auto w-full max-w-6xl space-y-8">
        <ProjectPageHeader
          eyebrow="Project setup"
          title={
            projectData
              ? `Connect ${projectData.name}.`
              : 'Connect your project.'
          }
          description="Add the PathLens tracker to your frontend, send a first page view, and start seeing customer behavior."
          actions={
            <Button
              variant="outline"
              render={
                <Link
                  to="/app/$workspace/projects/$project/dashboard"
                  params={{ workspace, project }}
                />
              }
            >
              Skip to dashboard
              <ArrowRight />
            </Button>
          }
        />

        {isError && (
          <div className="text-destructive rounded-xl border border-dashed px-5 py-4 text-sm">
            Unable to load this project key. You can retry or open the project
            dashboard and return to setup later.
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              number: '01',
              icon: Code2,
              title: 'Install the tracker',
              description: 'Choose your frontend and add one small snippet.',
            },
            {
              number: '02',
              icon: Globe2,
              title: 'Load your app',
              description: 'Open a page where the tracker is installed.',
            },
            {
              number: '03',
              icon: CircleCheck,
              title: 'Verify events',
              description:
                'Return to PathLens and watch your first signal arrive.',
            },
          ].map((step) => {
            const Icon = step.icon

            return (
              <div key={step.number} className="rounded-2xl border p-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground text-xs font-medium tracking-[0.18em]">
                    {step.number}
                  </span>
                  <Icon className="text-primary size-5" />
                </div>
                <p className="mt-6 font-medium">{step.title}</p>
                <p className="text-muted-foreground mt-2 text-sm leading-6">
                  {step.description}
                </p>
              </div>
            )
          })}
        </div>

        <ProjectPanel>
          <CardHeader className="border-b px-5 py-5">
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
                <Terminal className="size-5" />
              </div>
              <div>
                <CardTitle>Install the PathLens tracker</CardTitle>
                <CardDescription className="mt-1">
                  The same client-side tracker works with any frontend stack.
                  The local script URL below is ready for development.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-5">
            {isPending ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-72 w-full" />
              </div>
            ) : (
              <Tabs defaultValue="html">
                <TabsList className="h-auto w-full flex-wrap justify-start gap-1 bg-transparent p-0">
                  {snippets.map((snippet) => (
                    <TabsTrigger
                      key={snippet.id}
                      value={snippet.id}
                      className="data-[state=active]:bg-muted rounded-lg px-3 py-2"
                    >
                      {snippet.label}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {snippets.map((snippet) => (
                  <TabsContent
                    key={snippet.id}
                    value={snippet.id}
                    className="mt-5 space-y-4"
                  >
                    <p className="text-muted-foreground text-sm">
                      {snippet.description}
                    </p>
                    <CodeBlock
                      code={snippet.code}
                      language={snippet.language}
                      onCopy={() =>
                        void copyText(snippet.code, `${snippet.label} snippet`)
                      }
                    />
                  </TabsContent>
                ))}
              </Tabs>
            )}
          </CardContent>
        </ProjectPanel>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
          <ProjectPanel>
            <CardHeader className="border-b px-5 py-5">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                  <ShieldCheck className="size-5" />
                </div>
                <div>
                  <CardTitle>Verify your installation</CardTitle>
                  <CardDescription className="mt-1">
                    Once your app is running, PathLens will begin collecting
                    page views and events automatically.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-5">
              <div className="space-y-3 text-sm">
                {[
                  'Start your frontend locally or deploy it to a preview URL.',
                  'Visit a page with the tracker installed.',
                  'Open the dashboard to see incoming activity.',
                ].map((step) => (
                  <div key={step} className="flex items-start gap-3">
                    <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                    <span>{step}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-3 pt-2">
                <Button
                  render={
                    <Link
                      to="/app/$workspace/projects/$project/dashboard"
                      params={{ workspace, project }}
                    />
                  }
                >
                  Open dashboard
                  <ArrowRight />
                </Button>
                <Button
                  variant="outline"
                  render={
                    <Link
                      to="/app/$workspace/projects/$project/keys"
                      params={{ workspace, project }}
                    />
                  }
                >
                  View API key
                </Button>
              </div>
            </CardContent>
          </ProjectPanel>

          <ProjectPanel>
            <CardHeader className="border-b px-5 py-5">
              <div className="flex items-start gap-3">
                <div className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-xl">
                  <KeyRound className="size-5" />
                </div>
                <div>
                  <CardTitle>Project key</CardTitle>
                  <CardDescription className="mt-1">
                    This client-side key identifies your project.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 p-5">
              {isPending ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={projectData?.apiKey ?? ''}
                    className="font-mono text-xs"
                    aria-label="Project key"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Copy project key"
                    onClick={() =>
                      void copyText(projectData?.apiKey ?? '', 'Project key')
                    }
                  >
                    {copied === 'Project key' ? <Check /> : <Copy />}
                  </Button>
                </div>
              )}
              <p className="text-muted-foreground text-xs leading-5">
                Keep this value in your client-side tracker configuration. Do
                not use server credentials in browser code.
              </p>
            </CardContent>
          </ProjectPanel>
        </div>
      </div>
    </ProjectPageLayout>
  )
}
