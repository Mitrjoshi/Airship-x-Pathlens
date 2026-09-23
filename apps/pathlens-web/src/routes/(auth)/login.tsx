import { motion } from 'motion/react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import {
  InputGroup,
  InputGroupButton,
  InputGroupInput,
} from '@workspace/ui/components/input-group'
import { Label } from '@workspace/ui/components/label'
import { ArrowLeft, EyeIcon } from 'lucide-react'

export const Route = createFileRoute('/(auth)/login')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className="grid h-screen grid-cols-[0.5fr_1fr] items-center justify-center divide-x">
      <div className="relative flex h-screen flex-1 items-center justify-center">
        <div className="absolute top-4 left-0 flex w-full items-center justify-between px-4">
          <Link to="/">
            <Button variant="ghost">
              <ArrowLeft />
              Home
            </Button>
          </Link>
        </div>
        <div className="w-sm space-y-2">
          <div className="mb-12">
            <p className="text-4xl font-semibold">Welcome Back</p>
            <p className="text-muted-foreground">Sign in to Continue</p>
          </div>

          <div className="space-y-2">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input placeholder="you@example.com" className="" />
            </div>

            <div className="space-y-2">
              <div className="flex w-full items-center justify-between">
                <Label>Password</Label>
                <Button variant="link" className={'p-0'}>
                  Forgot Password?
                </Button>
              </div>
              <InputGroup className="overflow-hidden">
                <InputGroupInput
                  className="overflow-hidden"
                  placeholder="000000"
                  autoComplete="current-password"
                  type="password"
                />
                <InputGroupButton variant={'outline'} size="icon-sm">
                  <EyeIcon />
                </InputGroupButton>
              </InputGroup>
            </div>
          </div>
          <Button className={'w-full'}>Sign in</Button>

          <div>
            <p className="text-muted-foreground text-center text-sm">
              Don't have an Account?{' '}
              <Button
                className={'h-6 p-0 underline'}

                variant={'link'}
              >
                Sign Up
              </Button>
            </p>
          </div>

          <p className="text-muted-foreground mx-auto mt-8 max-w-[75%] text-center text-xs">
            By continuing, I agree to Pathlens's terms, privacy policy, and
            cookie policy.
          </p>
        </div>
      </div>

      <div className="relative flex h-screen flex-1 items-center justify-center overflow-hidden">
        {/* subtle background grid */}
        <div className="line-grid-uni pointer-events-none absolute inset-0 opacity-40" />

        <div className="relative z-10 max-w-4xl px-6 text-center">
          {/* quote mark */}
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-primary/20 absolute -top-20 left-1/2 -translate-x-1/2 text-[180px] leading-none select-none"
          >
            “
          </motion.span>

          {/* eyebrow */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground mb-5 flex items-center justify-center gap-2 text-xs"
          >
            Loved by people who care about clarity
          </motion.div>

          {/* quote */}
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{
              delay: 0.18,
              duration: 0.6,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="text-foreground text-4xl font-medium tracking-tight md:text-6xl md:leading-[1.08]"
          >
            Pathlens makes website analytics feel
            <span className="text-muted-foreground"> ridiculously simple.</span>
          </motion.p>

          {/* author */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="mt-8 flex items-center justify-center gap-2"
          >
            <div className="bg-primary/10 flex size-10 items-center justify-center rounded-full">
              <img
                src="/logo.png"
                alt="Pathlens"
                className="size-7 object-contain dark:invert"
              />
            </div>

            <div className="text-left">
              <p className="text-foreground text-sm font-medium">@Pathlens</p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
