import { ModeToggle } from '@/components/common/mode-toggle'
import { Link } from '@tanstack/react-router'

export const AuthHeader = () => {
  return (
    <header className="flex h-16 items-center justify-between border-b px-5 sm:px-8">
      <Link
        to="/"
        className="flex items-center gap-2 font-semibold tracking-tight"
      >
        <img
          src="/logo.png"
          alt="PathLens"
          className="size-7 rounded-md object-contain"
        />
        PathLens
      </Link>
      <ModeToggle />
    </header>
  )
}
