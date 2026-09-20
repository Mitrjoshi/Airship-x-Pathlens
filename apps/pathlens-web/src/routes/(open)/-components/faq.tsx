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
      'Add the Pathlens tracking script to your website and provide your project ID. Once installed, Pathlens automatically starts collecting supported user interactions.',
  },
  {
    question: 'What does Pathlens track?',
    answer:
      'Pathlens can track page views, clicks, scrolls, form interactions, user sessions, and other behavioral events to help you understand how visitors use your website.',
  },
  {
    question: 'Is user data private?',
    answer:
      'Yes. Privacy is built into Pathlens by default. User inputs are masked, and sensitive fields such as passwords are excluded from tracking.',
  },
  {
    question: 'Does Pathlens affect website performance?',
    answer:
      'The tracking script is designed to run efficiently in the background so analytics collection has minimal impact on your website experience.',
  },
  {
    question: 'What are session recordings?',
    answer:
      'Session recordings let you replay anonymized user sessions to see how visitors navigate, interact with elements, and move through your website.',
  },
  {
    question: 'Can I track multiple websites?',
    answer:
      'Yes. You can create multiple projects within your workspace and manage analytics for each website separately.',
  },
  {
    question: 'Can I use Pathlens for free?',
    answer:
      'Yes. The Free plan lets you get started with Pathlens without a time limit or credit card, with usage limits on projects, page views, events, recordings, and other features.',
  },
  {
    question: 'What happens when I reach my plan limit?',
    answer:
      'Your usage is limited according to your plan. You can upgrade to a higher plan when you need more traffic, recordings, projects, or advanced analytics.',
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
          </div>
        </div>
      </DotLayout>
    </HomeLayout>
  )
}
