import { cn } from "@workspace/ui/lib/utils"
import React from "react"

export default function PageLayout({
  className,
  children,
  ...props
}: React.PropsWithChildren<React.ComponentProps<"main">>) {
  return (
    <main
      className={cn("flex flex-1 flex-col gap-4 p-4", className)}
      {...props}
    >
      {children}
    </main>
  )
}
