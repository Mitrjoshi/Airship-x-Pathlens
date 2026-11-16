import { createFileRoute, Link } from '@tanstack/react-router'
import { HomeLayout } from '../(open)/-components/home-layout'
import { DotLayout } from '../(open)/-components/dot-layout'
import { Separator } from '@workspace/ui/components/separator'
import { directory, directoryFilters } from './constants/directory'
import { useMemo, useState } from 'react'
import { TitleReveal } from '../(open)/products/$productId/-components/title-reveal'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@workspace/ui/components/input-group'
import { SearchIcon } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'

export const Route = createFileRoute('/docs/directory')({
  component: RouteComponent,
})

const columns = 3

function RouteComponent() {
  const [activeFilter, setActiveFilter] = useState('all')

  const filteredDirectory = useMemo(() => {
    if (activeFilter.toLowerCase() === 'all') {
      return directory
    }

    return directory.filter(
      (item) => item.category.toLowerCase() === activeFilter.toLowerCase()
    )
  }, [activeFilter])

  return (
    <>
      <HomeLayout>
        <DotLayout className="border-x-2 border-dashed">
          <div className="bg-background mx-auto max-w-[75%] border-x-2 border-dashed p-20">
            <div className="mx-auto w-fit">
              <div>
                <TitleReveal
                  title={`Directory`}
                  description={`Everything you need to integrate, track, analyze, and understand your website's performance with Pathlens.`}
                  className="flex flex-col gap-2 text-center"
                />
              </div>
            </div>
          </div>
        </DotLayout>
      </HomeLayout>

      <Separator className="border-b-2 border-dashed bg-transparent" />

      <HomeLayout>
        <DotLayout className="border-x-2 border-dashed">
          <div className="bg-background mx-auto max-w-[75%] border-x-2 border-dashed p-20">
            <div className="space-y-6">
              {/* Category Filters */}
              <div className="flex items-center justify-between gap-2">
                <InputGroup className="w-80">
                  <InputGroupAddon>
                    <SearchIcon />
                  </InputGroupAddon>

                  <InputGroupInput placeholder="Search..." />
                </InputGroup>

                <Select
                  items={directoryFilters}
                  value={activeFilter}
                  onValueChange={(e) => setActiveFilter(e as string)}
                >
                  <SelectTrigger className={'min-w-32'}>
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    {directoryFilters.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Directory Grid */}
              <div className="border-border grid grid-cols-1 border-t-2 border-l-2 border-dashed sm:grid-cols-2 lg:grid-cols-3">
                {filteredDirectory.map((item, index) => {
                  const isFirstRow = index < columns
                  const isFirstColumn = index % columns === 0

                  return (
                    <Link to={item.href}>
                      <div
                        key={index}
                        className={`border-border group relative cursor-pointer border-r-2 border-b-2 border-dashed p-4 ${
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

              {/* Empty State */}
              {filteredDirectory.length === 0 && (
                <div className="py-16 text-center">
                  <p className="font-medium">No documentation found</p>

                  <p className="text-muted-foreground mt-2 text-sm">
                    There are no documentation resources available for this
                    category.
                  </p>
                </div>
              )}
            </div>
          </div>
        </DotLayout>
      </HomeLayout>
    </>
  )
}
