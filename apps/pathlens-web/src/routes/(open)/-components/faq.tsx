import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@workspace/ui/components/accordion'

import { DotLayout } from './dot-layout'
import { HomeLayout } from './home-layout'

const faqs = [
  {
    question: 'What is Pathlens?',
    answer:
      'Pathlens is a privacy-conscious product analytics platform that helps you understand how users interact with your website through events, session recordings, heatmaps, funnels, and goals.',
  },
  {
    question: 'How do I add Pathlens to my website?',
    answer:
      'Install the Pathlens tracking script on your website and connect it to your project. Once installed, Pathlens begins collecting supported user interactions.',
  },
  {
    question: 'What does Pathlens track?',
    answer:
      'Pathlens tracks page views, clicks, scrolls, form interactions, sessions, and other behavioral events to help you understand how visitors use your website.',
  },
  {
    question: 'Is user data private?',
    answer:
      'Yes. Pathlens masks user inputs and excludes sensitive fields such as passwords from session tracking.',
  },
  {
    question: 'Can I see what users do on my website?',
    answer:
      'Yes. Session recordings and interaction data show where users click, how far they scroll, which pages they visit, and where they may get stuck.',
  },
  {
    question: 'Can Pathlens help improve conversions?',
    answer:
      'Yes. Funnels, goals, and events help you identify drop-off points and measure important actions such as sign-ups, purchases, and form submissions.',
  },
  {
    question: 'What are heatmaps?',
    answer:
      'Heatmaps show where visitors click, scroll, and interact most frequently, helping you understand which parts of a page receive the most attention.',
  },
  {
    question: 'Can I track multiple websites?',
    answer:
      'Yes. You can create multiple projects within your workspace and manage analytics for each website separately.',
  },
  {
    question: 'Do I need to be a developer to use Pathlens?',
    answer:
      'Not for everyday analytics. After installation, you can explore dashboards, recordings, funnels, heatmaps, and reports without writing code.',
  },
  {
    question: 'Can I use Pathlens for free?',
    answer:
      'Yes. The Free plan lets you get started without a time limit or credit card, with usage limits based on projects, page views, events, recordings, and other features.',
  },
]

export const FAQ = () => {
  return (
    <HomeLayout>
      <DotLayout className="border-x-2 border-t-2 border-dashed">
        <div className="bg-background nut-top-left nut-top-right mx-auto grid max-w-[75%] grid-cols-2 border-x-2 border-dashed">
          <div className="border-r-2 border-dashed p-20">
            <p className="text-4xl font-medium">
              Your questions,
              <br />
              answered
            </p>

            <p className="text-muted-foreground mt-4 max-w-sm">
              Everything you need to know about tracking, privacy, analytics,
              and getting started with Pathlens.
            </p>
          </div>

          <div className="p-10">
            <FaqQuestions />
          </div>
        </div>
      </DotLayout>
    </HomeLayout>
  )
}

export const FaqQuestions = () => {
  return (
    <>
      <Accordion className="w-full">
        {faqs.map((faq, index) => (
          <AccordionItem key={faq.question} value={`item-${index}`}>
            <AccordionTrigger className="cursor-pointer text-left text-base font-medium">
              {faq.question}
            </AccordionTrigger>

            <AccordionContent className="text-muted-foreground pr-6 leading-6">
              {faq.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </>
  )
}
