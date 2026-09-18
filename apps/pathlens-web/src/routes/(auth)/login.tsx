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
    <div className="flex h-screen items-center justify-center">
      <div className="relative flex h-screen flex-1 items-center justify-center">
        <div className="absolute top-4 left-0 flex w-full items-center justify-between px-4">
          <Link to="/">
            <Button variant="ghost" size="lg">
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

          {/* <div className="space-y-2">
            <div className="grid w-full grid-cols-3 gap-2">
              <Button size="lg" variant="outline">
                Google
              </Button>
              <Button size="lg" variant="outline">
                Apple
              </Button>
              <Button size="lg" variant="outline">
                Github
              </Button>
            </div>

            <Button size="lg" variant="outline" className={'w-full'}>
              Continue with SSO
            </Button>
          </div>

          <Marker variant="separator">
            <MarkerContent>or</MarkerContent>
          </Marker> */}

          <div className="space-y-2">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input placeholder="you@example.com" className="h-10" />
            </div>

            <div className="space-y-2">
              <div className="flex w-full items-center justify-between">
                <Label>Password</Label>
                <Button variant="link" className={'p-0'}>
                  Forgot Password?
                </Button>
              </div>
              <InputGroup className="h-10 overflow-hidden">
                <InputGroupInput
                  className="h-10 overflow-hidden"
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
          <Button className={'h-10 w-full'} size="lg">
            Sign in
          </Button>

          <div>
            <p className="text-muted-foreground text-center text-sm">
              Don't have an Account?{' '}
              <Button
                className={'h-6 p-0 underline'}
                size="lg"
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

      <div className="bg-primary relative h-screen flex-1"></div>
    </div>
  )
}
