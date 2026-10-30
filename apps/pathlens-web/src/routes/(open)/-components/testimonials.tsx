import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@workspace/ui/components/avatar'
import { Button } from '@workspace/ui/components/button'
import { Separator } from '@workspace/ui/components/separator'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'

const testimonials = [
  {
    name: 'Alex Morgan',
    role: 'Founder',
    company: 'Launchpad',
    content:
      "We noticed people were clicking on elements that weren't actually buttons. Didn't think much of it until we saw the heatmaps. A couple of small UI changes later, and our landing page started performing noticeably better.",
  },
  {
    name: 'Sarah Chen',
    role: 'Product Designer',
    company: 'Forma Studio',
    content:
      "I've been using Pathlens for a few weeks now, mostly for session recordings. It's surprising how differently people navigate a page compared to what we expect during design.",
  },
  {
    name: 'James Wilson',
    role: 'CTO',
    company: 'Stackflow',
    content:
      'Setup was straightforward. Added the script, enabled the tracking options we needed, and started seeing events. Having errors and performance data alongside analytics is convenient.',
  },
  {
    name: 'Priya Sharma',
    role: 'Growth Manager',
    company: 'Northstar',
    content:
      "Our signup funnel had a pretty significant drop-off, but we couldn't figure out why from our existing analytics. Watching a few sessions made the problem obvious. Users were getting confused by one of the form fields.",
  },
  {
    name: 'Daniel Kim',
    role: 'Frontend Developer',
    company: 'Devcraft',
    content:
      'Honestly, I mainly wanted something to check JavaScript errors without digging through logs all day. The session context turned out to be the most useful part.',
  },
  {
    name: 'Olivia Bennett',
    role: 'Marketing Lead',
    company: 'Brightside',
    content:
      'Really like being able to see what happens after someone lands on a campaign page. Traffic numbers are nice, but knowing whether people actually scroll, click, and engage is much more helpful.',
  },
  {
    name: 'Ethan Brooks',
    role: 'Product Manager',
    company: 'Pixelwave',
    content:
      "We used to rely on assumptions about how visitors interacted with our product pages. Pathlens gave us a much clearer picture. It's become part of our regular product review process.",
  },
  {
    name: 'Maya Patel',
    role: 'UX Researcher',
    company: 'Flowbase',
    content:
      'Session recordings have been particularly useful when reviewing new features. Instead of guessing where users struggle, we can watch what actually happens and make improvements based on that.',
  },
  {
    name: 'Noah Williams',
    role: 'Software Engineer',
    company: 'Buildstack',
    content:
      'What I appreciate most is having errors, events, and session context available together. It makes investigating unexpected behavior much easier than jumping between multiple tools.',
  },
  {
    name: 'Isabella Martinez',
    role: 'Head of Growth',
    company: 'Convertly',
    content:
      'We discovered that visitors were abandoning a key page much earlier than expected. The scroll heatmaps helped us reorganize the content and make the important information easier to find.',
  },
  {
    name: 'Ryan Foster',
    role: 'Indie Developer',
    company: 'Shipfast',
    content:
      "I wanted analytics that didn't require a complicated setup. Pathlens was simple to integrate, and being able to replay sessions has helped me understand how people actually use my projects.",
  },
  {
    name: 'Emily Carter',
    role: 'Digital Experience Lead',
    company: 'Nexora',
    content:
      'Having a single place to understand visitor activity has made collaboration between our design and development teams much smoother. Everyone can see the same behavior and discuss improvements.',
  },
]

const ITEMS_PER_PAGE = 6
const ROTATION_INTERVAL = 7000

const testimonialPages = Array.from(
  { length: Math.ceil(testimonials.length / ITEMS_PER_PAGE) },
  (_, index) =>
    testimonials.slice(index * ITEMS_PER_PAGE, (index + 1) * ITEMS_PER_PAGE)
)

const getInitials = (name: string) =>
  name
    .split(' ')
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase()

interface TestimonialCardProps {
  testimonial: (typeof testimonials)[number]
  index: number
  reducedMotion: boolean
}

const TestimonialCard = ({
  testimonial,
  index,
  reducedMotion,
}: TestimonialCardProps) => {
  return (
    <motion.div
      layout={!reducedMotion}
      initial={
        reducedMotion
          ? false
          : {
              opacity: 0,
              y: 24,
              filter: 'blur(4px)',
            }
      }
      animate={{
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
      }}
      exit={
        reducedMotion
          ? { opacity: 0 }
          : {
              opacity: 0,
              y: -12,
              filter: 'blur(4px)',
            }
      }
      transition={{
        duration: reducedMotion ? 0.1 : 0.45,
        delay: reducedMotion ? 0 : index * 0.07,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="mb-2 w-full break-inside-avoid"
    >
      <div className="bg-card/30 hover:bg-card/60 flex w-full flex-col overflow-hidden rounded-2xl border transition-colors duration-300">
        <div className="p-4">
          <p className="text-foreground/90 leading-relaxed">
            {testimonial.content}
          </p>
        </div>

        <Separator />

        <div className="flex items-center justify-end gap-2 p-4 text-right">
          <div>
            <p className="text-sm font-medium">{testimonial.name}</p>
            <p className="text-muted-foreground text-sm leading-4">
              {testimonial.company} - {testimonial.role}
            </p>
          </div>

          <Avatar>
            <AvatarImage src={undefined} alt={testimonial.name} />
            <AvatarFallback className="bg-primary/10 text-primary text-xs">
              {getInitials(testimonial.name)}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </motion.div>
  )
}

export const Testimonials = () => {
  const [activePage, setActivePage] = useState(0)
  const [isHovered, setIsHovered] = useState(false)

  const reducedMotion = useReducedMotion() ?? false

  useEffect(() => {
    if (isHovered || reducedMotion || testimonialPages.length <= 1) {
      return
    }

    const interval = window.setInterval(() => {
      setActivePage((previous) => (previous + 1) % testimonialPages.length)
    }, ROTATION_INTERVAL)

    return () => window.clearInterval(interval)
  }, [isHovered, reducedMotion])

  return (
    <div className="nut-top-right space-y-10 p-10 pt-20">
      <div className="mx-auto flex flex-col items-center justify-center gap-8 text-center">
        <div>
          <p className="mx-auto w-fit text-center text-4xl font-medium">
            Join the <span className="text-primary">Community</span>
          </p>

          <p className="text-muted-foreground mx-auto mt-3 max-w-lg">
            Join a growing community of developers, creators, and businesses
            building better digital experiences with Pathlens. Discover their
            stories, share ideas, and learn from real experiences.
          </p>
        </div>

        <Button variant="outline">Join us on Discord</Button>
      </div>

      <div
        className="mx-auto max-w-7xl"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onFocusCapture={() => setIsHovered(true)}
        onBlurCapture={(event) => {
          if (
            !event.currentTarget.contains(event.relatedTarget as Node | null)
          ) {
            setIsHovered(false)
          }
        }}
      >
        <div className="relative">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activePage}
              initial={reducedMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{
                duration: reducedMotion ? 0.1 : 0.3,
              }}
            >
              <div className="columns-1 gap-2 md:columns-2 lg:columns-3">
                {testimonialPages[activePage].map((testimonial, index) => (
                  <TestimonialCard
                    key={testimonial.name}
                    testimonial={testimonial}
                    index={index}
                    reducedMotion={reducedMotion}
                  />
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-8 flex items-center justify-center gap-2">
          {testimonialPages.map((_, index) => (
            <button
              key={index}
              type="button"
              aria-label={`Show testimonials page ${index + 1}`}
              aria-current={activePage === index ? 'true' : undefined}
              onClick={() => setActivePage(index)}
              className={`h-1.5 cursor-pointer rounded-full transition-all duration-500 ${
                activePage === index
                  ? 'bg-primary w-8'
                  : 'bg-muted-foreground/20 hover:bg-muted-foreground/40 w-1.5'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
