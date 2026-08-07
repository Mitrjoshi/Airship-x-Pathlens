import { useEffect, useRef, useState } from 'react'

export function useInView<T extends HTMLElement>(rootMargin = '0px 0px -10%') {
  const ref = useRef<T>(null)
  const [isInView, setIsInView] = useState(false)

  useEffect(() => {
    const element = ref.current

    if (!element || isInView) return

    if (!('IntersectionObserver' in window)) {
      const frame = requestAnimationFrame(() => setIsInView(true))

      return () => cancelAnimationFrame(frame)
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return

        setIsInView(true)
        observer.unobserve(element)
      },
      { rootMargin }
    )

    observer.observe(element)

    return () => observer.disconnect()
  }, [isInView, rootMargin])

  return { ref, isInView }
}
