import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'

type AnimatedWordsProps = {
  words: string[]
  interval?: number
  className?: string
  extraWidth?: number
}

export const AnimatedWords = ({
  words,
  interval = 4000,
  className = 'text-primary',
  extraWidth = 16,
}: AnimatedWordsProps) => {
  const [index, setIndex] = useState(0)
  const [width, setWidth] = useState<number>()
  const measureRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % words.length)
    }, interval)

    return () => clearInterval(timer)
  }, [interval, words.length])

  useLayoutEffect(() => {
    if (measureRef.current) {
      setWidth(measureRef.current.offsetWidth + extraWidth)
    }
  }, [index])

  const currentWord = words[index]

  return (
    <motion.span
      className={`relative inline-block overflow-hidden align-bottom ${className}`}
      style={{ height: '1.2em' }}
      animate={{ width }}
      transition={{
        duration: 0.45,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {/* Invisible text controls the width */}
      <span
        ref={measureRef}
        className="invisible absolute top-0 left-0 inline-block whitespace-nowrap"
        aria-hidden="true"
      >
        {currentWord}
      </span>

      <AnimatePresence mode="popLayout">
        <motion.span
          key={currentWord}
          className="absolute inset-0 inline-flex items-center whitespace-nowrap"
          aria-label={currentWord}
        >
          {currentWord.split('').map((char, i) => (
            <motion.span
              key={`${currentWord}-${i}`}
              className="inline-block"
              initial={{
                opacity: 0,
                filter: 'blur(8px)',
                scale: 0.75,
                y: 8,
              }}
              animate={{
                opacity: 1,
                filter: 'blur(0px)',
                scale: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
                filter: 'blur(8px)',
                scale: 1.15,
                y: -8,
              }}
              transition={{
                duration: 0.45,
                delay: i * 0.045,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              {char === ' ' ? '\u00A0' : char}
            </motion.span>
          ))}
        </motion.span>
      </AnimatePresence>
    </motion.span>
  )
}
