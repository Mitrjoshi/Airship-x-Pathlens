import type { ReactNode } from 'react'

type TitleRevealProps = {
  title: ReactNode
  description?: ReactNode
  className?: string
}

export const TitleReveal = ({
  title,
  description,
  className,
}: TitleRevealProps) => {
  return (
    <div className={className}>
      <h1 className="center-blur-reveal text-4xl font-medium tracking-tight sm:text-5xl lg:text-6xl">
        {title}
      </h1>

      {description && (
        <p className="text-muted-foreground supporting-reveal mx-auto max-w-xl text-base leading-relaxed">
          {description}
        </p>
      )}
    </div>
  )
}
