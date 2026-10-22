import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { animate, inView } from 'motion'
import './styles.css'

gsap.registerPlugin(ScrollTrigger)
gsap.fromTo(
  '#gsap-reveal',
  { opacity: 0, y: 80 },
  {
    opacity: 1,
    y: 0,
    scrollTrigger: { trigger: '#gsap-reveal', start: 'top 80%' },
  }
)
gsap.to('#gsap-scrub', {
  x: 240,
  scrollTrigger: {
    trigger: '#gsap-scrub',
    start: 'top bottom',
    end: 'bottom top',
    scrub: true,
  },
})
inView('#motion-reveal', () => {
  animate(
    '#motion-reveal',
    { opacity: 1, transform: 'translateY(0px)' },
    { duration: 0.25 }
  )
})
inView('#intersection', () => {
  document.querySelector('#intersection')?.setAttribute('data-visible', 'true')
})
