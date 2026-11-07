import { cn } from '@workspace/ui'
import { useEffect, useRef, useState, type ImgHTMLAttributes } from 'react'

type BlurImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  wrapperClassName?: string
}

export function BlurImage({
  src,
  alt,
  className,
  wrapperClassName,
  onLoad,
  ...props
}: BlurImageProps) {
  const [loaded, setLoaded] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const img = imgRef.current
    setLoaded(!!img?.complete && img.naturalWidth > 0)
  }, [src])

  return (
    <div className={cn('bg-muted overflow-hidden', wrapperClassName)}>
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        onLoad={(e) => {
          setLoaded(true)
          onLoad?.(e)
        }}
        className={cn(
          'h-full w-full object-cover object-center transition-all duration-200 ease-out',
          loaded ? 'blur-0 scale-100' : 'scale-105 blur-xl',
          className
        )}
        {...props}
      />
    </div>
  )
}
