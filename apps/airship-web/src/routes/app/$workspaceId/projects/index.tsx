import PageLayout from "@/components/page-layout"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@workspace/ui/components/input-group"
import { Separator } from "@workspace/ui/components/separator"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group"
import { createFileRoute } from "@tanstack/react-router"
import { format } from "date-fns"
import {
  ClockIcon,
  FolderClosedIcon,
  GlobeIcon,
  LayoutGridIcon,
  ListFilterIcon,
  ListIcon,
  MessageSquareCodeIcon,
  MoreHorizontalIcon,
  PlusIcon,
  RotateCcwIcon,
  SearchIcon,
  SettingsIcon,
  StarIcon,
  TagIcon,
  UsersIcon,
} from "lucide-react"

export const Route = createFileRoute("/app/$workspaceId/projects/")({
  component: RouteComponent,
})

type Project = {
  id: string
  name: string
  description: string | null
  url: string
  domain: string
  createdAt: Date
  tag: string
  lastMessage: string
  members: number
  isActive: boolean
  favorite: boolean
}

const PROJECTS: Project[] = [
  {
    id: crypto.randomUUID(),
    name: "Basecamp",
    description:
      "This is a description Lorem ipsum dolor sit amet consectetur adipisicing elit.",
    url: "#",
    domain: "basecamp.com",
    createdAt: new Date(),
    tag: "Production",
    lastMessage: "First deployment",
    members: 7,
    isActive: true,
    favorite: false,
  },
  {
    id: crypto.randomUUID(),
    name: "Ogilvy Studio",
    description: null,
    url: "#",
    domain: "ogilvystudio.com",
    createdAt: new Date(),
    tag: "Development",
    lastMessage: "Integrated with Slack",
    members: 3,
    isActive: true,
    favorite: false,
  },
  {
    id: crypto.randomUUID(),
    name: "La beers - INDRA",
    description:
      "This is a description Lorem ipsum dolor sit amet consectetur adipisicing elit.",
    url: "#",
    domain: "indraonline.in",
    createdAt: new Date(),
    tag: "Staging",
    lastMessage: "Fixed workflow issue",
    members: 5,
    isActive: false,
    favorite: false,
  },
  {
    id: crypto.randomUUID(),
    name: "Milka - Matt Pokora",
    description:
      "This is a description Lorem ipsum dolor sit amet consectetur adipisicing elit.",
    url: "#",
    domain: "matt-pokora.milka.com",
    createdAt: new Date(),
    tag: "Development",
    lastMessage: "Fixed authentication issue",
    members: 2,
    isActive: true,
    favorite: false,
  },
  {
    id: crypto.randomUUID(),
    name: "Malika - Jhatt Pakora",
    description:
      "This is a description Lorem ipsum dolor sit amet consectetur adipisicing elit.",
    url: "#",
    domain: "matt-pokora.milka.com",
    createdAt: new Date(),
    tag: "Development",
    lastMessage: "Fixed authentication issue",
    members: 2,
    isActive: true,
    favorite: true,
  },
]

function RouteComponent() {
  const favoriteProjects = PROJECTS.filter((project) => project.favorite)

  return (
    <PageLayout>
      <section className="flex items-center justify-between gap-2">
        <InputGroup>
          <InputGroupInput placeholder="Search Projects" />
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
        </InputGroup>

        <Button variant="outline" size="icon">
          <ListFilterIcon />
        </Button>

        <ToggleGroup variant="outline" spacing={0}>
          <ToggleGroupItem value="grid" aria-label="Toggle grid">
            <LayoutGridIcon />
          </ToggleGroupItem>

          <ToggleGroupItem value="list" aria-label="Toggle list">
            <ListIcon />
          </ToggleGroupItem>
        </ToggleGroup>

        <Button>
          <PlusIcon />
          Add New
        </Button>
      </section>

      {favoriteProjects.length > 0 && (
        <>
          <ProjectSection title="Your Favorites" projects={favoriteProjects} />

          <Separator />
        </>
      )}

      <ProjectSection title="All Projects" projects={PROJECTS} />
    </PageLayout>
  )
}

function ProjectSection({
  title,
  projects,
}: {
  title: string
  projects: Project[]
}) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-medium">{title}</h2>

      <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {projects.map((project) => (
          <li key={project.id}>
            <ProjectCard project={project} />
          </li>
        ))}
      </ul>
    </section>
  )
}

function ProjectCard({ project }: { project: Project }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex gap-4">
          <div className="grid size-10 shrink-0 place-content-center rounded-lg border">
            <FolderClosedIcon />
          </div>

          <div className="min-w-0 flex-1">
            <CardTitle className="flex flex-wrap items-center gap-2">
              <span className="truncate text-sm">{project.name}</span>

              {!project.isActive && (
                <Badge variant="destructive">Inactive</Badge>
              )}
            </CardTitle>

            <CardDescription>
              {format(project.createdAt, "PPPp")}
            </CardDescription>
          </div>
        </div>

        <CardAction>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon">
                  <MoreHorizontalIcon />
                </Button>
              }
            />

            <DropdownMenuContent className="w-44">
              <DropdownMenuItem>
                <PlusIcon />
                Deploy New
              </DropdownMenuItem>

              <DropdownMenuItem>
                <StarIcon />
                {project.favorite ? "Remove Favorite" : "Add Favorite"}
              </DropdownMenuItem>

              <DropdownMenuItem>
                <UsersIcon />
                Manage Members
              </DropdownMenuItem>

              <DropdownMenuItem>
                <ClockIcon />
                Deployment History
              </DropdownMenuItem>

              <DropdownMenuItem disabled>
                <GlobeIcon />
                Manage Domain
              </DropdownMenuItem>

              <DropdownMenuItem>
                <SettingsIcon />
                Settings
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem variant="destructive">
                <RotateCcwIcon />
                Instant Rollback
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-5">
        {project.description && (
          <p className="text-muted-foreground">{project.description}</p>
        )}

        <ul className="mt-auto flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
          <li className="flex w-full items-center gap-1.5">
            <MessageSquareCodeIcon className="size-4 shrink-0" />
            <p className="truncate">{project.lastMessage}</p>
          </li>

          <li className="flex items-center gap-1.5">
            <GlobeIcon className="size-4 shrink-0" />
            <p className="whitespace-nowrap">{project.domain}</p>
          </li>

          <li className="flex items-center gap-1.5">
            <TagIcon className="size-4 shrink-0" />
            <p className="whitespace-nowrap">{project.tag}</p>
          </li>

          <li className="flex items-center gap-1.5">
            <UsersIcon className="size-4 shrink-0" />
            <p className="whitespace-nowrap">{project.members} members</p>
          </li>
        </ul>
      </CardContent>
    </Card>
  )
}
