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

  // More relatable FAQs

  {
    question: 'Why are visitors leaving my website?',
    answer:
      'Pathlens helps you identify where visitors lose interest by showing drop-offs, navigation patterns, session recordings, and engagement across important pages.',
  },
  {
    question: 'Can I see what users actually do on my website?',
    answer:
      'Yes. Session recordings and interaction data help you understand where users click, how far they scroll, which pages they visit, and where they may get stuck.',
  },
  {
    question: 'Can Pathlens help me improve conversions?',
    answer:
      'Yes. Funnels, goals, events, and behavioral insights can help you discover where users drop off and which parts of your website may need improvement.',
  },
  {
    question: 'Can I see which pages are performing best?',
    answer:
      'Yes. Pathlens shows page views, visits, engagement, user activity, and other metrics so you can understand which pages attract and retain the most attention.',
  },
  {
    question: 'Can I find out where my visitors are coming from?',
    answer:
      'Yes. Pathlens can help you understand traffic sources and referral information so you can see which channels are bringing visitors to your website.',
  },
  {
    question: 'Can I track button clicks and important actions?',
    answer:
      'Yes. You can track interactions such as button clicks, links, form actions, sign-ups, purchases, and other events that matter to your website.',
  },
  {
    question: 'Can I track sign-ups or purchases?',
    answer:
      'Yes. You can define important actions as goals or events and measure how many visitors complete them.',
  },
  {
    question: 'How do I know where users are dropping off?',
    answer:
      'Funnels help you visualize each step of a user journey and identify the exact stages where visitors are leaving before completing an action.',
  },
  {
    question: 'Can I understand which parts of a page get the most attention?',
    answer:
      'Yes. Heatmaps help you understand where users click, scroll, and interact most frequently on your pages.',
  },
  {
    question: 'Can I use Pathlens on an existing website?',
    answer:
      'Yes. You can add Pathlens to an existing website without rebuilding it. Simply install the tracking script and connect it to your project.',
  },
  {
    question: 'Do I need to be a developer to use Pathlens?',
    answer:
      'Not for everyday analytics. Once Pathlens is installed, you can explore dashboards, recordings, funnels, heatmaps, and reports without writing code.',
  },
  {
    question: 'How quickly will I start seeing data?',
    answer:
      'Once the tracking script is installed correctly and visitors start using your website, activity will begin appearing in your Pathlens project.',
  },
  {
    question: 'Can I track users across different pages?',
    answer:
      'Yes. Pathlens connects activity across a visitor session so you can understand the journey users take from one page to another.',
  },
  {
    question: 'Can Pathlens help me find website problems?',
    answer:
      'Yes. Session recordings and behavioral data can reveal confusing navigation, ignored buttons, repeated clicks, unexpected drop-offs, and other usability issues.',
  },
  {
    question: 'What is the difference between events and goals?',
    answer:
      'Events represent individual user actions such as clicks or form submissions, while goals represent important outcomes you want users to complete, such as signing up or making a purchase.',
  },
  {
    question: 'What is a funnel?',
    answer:
      'A funnel represents a sequence of steps users are expected to complete. It helps you see how many users move through each step and where they drop off.',
  },
  {
    question: 'Who is Pathlens useful for?',
    answer:
      'Pathlens can be useful for product teams, marketers, founders, designers, developers, agencies, and anyone who wants to better understand how people use a website.',
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
