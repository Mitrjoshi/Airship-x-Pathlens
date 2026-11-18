import { createFileRoute } from '@tanstack/react-router'
import { HomeLayout } from '../(open)/-components/home-layout'
import { DotLayout } from '../(open)/-components/dot-layout'
import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight } from 'lucide-react'

export const Route = createFileRoute('/(references)/privacy')({
  component: RouteComponent,
})

const LAST_UPDATED = 'November 18, 2026'
const CONTACT_EMAIL = 'legal@pathlens.com' // Replace with verified email.
const LEGAL_ENTITY = '[Pathlens legal entity name]'

type PrivacySection = {
  id: string
  title: string
  paragraphs: string[]
  bullets?: string[]
}

const sections: PrivacySection[] = [
  {
    id: 'introduction',
    title: 'Introduction',
    paragraphs: [
      `This Privacy Policy explains how ${LEGAL_ENTITY} ("Pathlens", "we", "us", or "our") collects, uses, stores, discloses, and protects personal information in connection with our websites, analytics platform, dashboards, APIs, tracking technologies, and related services (collectively, the "Services").`,
      'We recognize the importance of privacy and are committed to handling personal information responsibly, transparently, and in accordance with applicable data protection laws.',
      'This Privacy Policy applies to information we process for our own business purposes. Where we process visitor analytics data on behalf of our customers, the customer generally determines how that data is collected and used, subject to applicable agreements and laws.',
    ],
  },
  {
    id: 'information-collected',
    title: 'Information We Collect',
    paragraphs: [
      'The information we collect depends on how you interact with Pathlens, the features you use, and the configuration of the Services.',
      'We may collect the following categories of information:',
    ],
    bullets: [
      'Account information, including your name, email address, organization, and account credentials.',
      'Profile and workspace information, including project names, team memberships, roles, and preferences.',
      'Technical information, such as IP addresses, browser type, operating system, device characteristics, and diagnostic logs.',
      'Usage information relating to your interactions with Pathlens dashboards, features, APIs, and documentation.',
      'Billing and transaction records associated with paid subscriptions, where applicable.',
      'Communications and support information you provide when contacting our team.',
      'Analytics information submitted through tracking scripts, SDKs, APIs, or integrations configured by customers.',
    ],
  },
  {
    id: 'analytics-data',
    title: 'Website Analytics and Visitor Data',
    paragraphs: [
      'Pathlens provides analytics tools that enable customers to measure and understand interactions with their websites and digital experiences.',
      'When a customer installs or integrates Pathlens tracking technology, the Services may receive information about interactions occurring on that customer’s digital properties.',
      'The specific data collected depends on the tracking configuration implemented by the customer, applicable consent settings, and the features enabled.',
    ],
    bullets: [
      'Page views, navigation events, and referring URLs.',
      'User interactions, including clicks and configured custom events.',
      'Session activity and event timestamps.',
      'Browser, device, operating system, and screen information.',
      'Approximate geographic information derived from technical data, where enabled.',
      'Technical identifiers used to associate events with visits or sessions, where applicable.',
      'Custom event properties submitted by the customer’s implementation.',
    ],
  },
  {
    id: 'customer-responsibilities',
    title: 'Customer Responsibilities',
    paragraphs: [
      'Customers using Pathlens tracking technologies are responsible for ensuring that their collection and use of visitor information complies with applicable privacy and data protection requirements.',
      'Where customers determine the purposes and means of processing visitor analytics data, they generally act as the data controller or equivalent responsible party, while Pathlens processes information to provide the contracted Services.',
      'Customers must provide appropriate notices, establish a valid legal basis, and obtain consent where required before enabling analytics collection.',
    ],
    bullets: [
      'Publish accurate privacy notices describing analytics collection.',
      'Implement consent mechanisms where required by applicable law.',
      'Respect applicable consent withdrawals and tracking preferences.',
      'Avoid transmitting passwords, payment card numbers, authentication tokens, or unnecessarily sensitive personal information.',
      'Review custom events and event properties before deploying tracking scripts.',
      'Respond to visitor privacy requests as required by applicable law.',
    ],
  },
  {
    id: 'information-use',
    title: 'How We Use Information',
    paragraphs: [
      'We process personal information for legitimate operational purposes, to perform our contractual obligations, to comply with legal requirements, and for other purposes supported by an applicable legal basis.',
      'Depending on the circumstances, we may use information for the following purposes:',
    ],
    bullets: [
      'Provide, maintain, and operate the Pathlens platform.',
      'Authenticate users and manage accounts, workspaces, and permissions.',
      'Process analytics events and generate dashboards, reports, and insights.',
      'Monitor service performance, diagnose errors, and improve reliability.',
      'Prevent fraud, misuse, unauthorized access, and security incidents.',
      'Provide technical support and respond to inquiries.',
      'Manage subscriptions, payments, and administrative records.',
      'Communicate important product, security, and policy updates.',
      'Comply with legal obligations and enforce applicable agreements.',
    ],
  },
  {
    id: 'legal-bases',
    title: 'Legal Bases for Processing',
    paragraphs: [
      'Where applicable data protection laws require a legal basis for processing personal information, we rely on the basis appropriate to the purpose and circumstances of the processing.',
      'These may include performance of a contract, compliance with legal obligations, legitimate interests that are not overridden by applicable individual rights, or consent where required.',
      'When Pathlens processes visitor analytics data on behalf of a customer, the customer is generally responsible for establishing and documenting the applicable legal basis for that collection.',
    ],
  },
  {
    id: 'cookies',
    title: 'Cookies and Similar Technologies',
    paragraphs: [
      'Pathlens and its customers may use cookies, local storage, session identifiers, or similar technologies, depending on how the Services and tracking implementations are configured.',
      'These technologies may support authentication, security, user preferences, session management, analytics collection, and platform functionality.',
      'Some technologies may require prior consent under applicable laws. Where required, non-essential tracking should not be activated before valid consent is obtained.',
      'You may be able to manage cookies through your browser settings or the consent controls provided by the website you visit. Disabling certain technologies may affect functionality or analytics accuracy.',
    ],
  },
  {
    id: 'information-sharing',
    title: 'How We Share Information',
    paragraphs: [
      'We may disclose personal information when reasonably necessary to operate the Services, fulfill contractual obligations, protect our rights, or comply with applicable law.',
      'Depending on the circumstances, information may be shared with the following categories of recipients:',
    ],
    bullets: [
      'Infrastructure, hosting, database, and cloud service providers.',
      'Authentication, communication, and technical support providers.',
      'Payment processors and billing service providers, where applicable.',
      'Analytics, monitoring, and security service providers supporting our operations.',
      'Professional advisers, auditors, and legal representatives where necessary.',
      'Regulators, courts, or public authorities when legally required.',
      'Successor organizations involved in a lawful merger, acquisition, or business restructuring, subject to appropriate safeguards.',
    ],
  },
  {
    id: 'third-party',
    title: 'Third-Party Services and Integrations',
    paragraphs: [
      'Pathlens may integrate with third-party tools and platforms to provide authentication, notifications, reporting, billing, or other functionality.',
      'When you enable an integration, information may be exchanged with the relevant service according to the permissions and configuration you select.',
      'Third-party providers may process information under their own privacy policies and contractual arrangements. We encourage users to review those policies before enabling integrations.',
      'We do not control the independent privacy practices of third-party services.',
    ],
  },
  {
    id: 'retention',
    title: 'Data Retention',
    paragraphs: [
      'We retain personal information only for as long as reasonably necessary to fulfill the purposes for which it was collected, comply with legal obligations, resolve disputes, and enforce applicable agreements.',
      'Retention periods may vary depending on the category of information, subscription arrangements, customer configurations, operational requirements, and applicable laws.',
      'Where we process analytics information on behalf of customers, retention and deletion may be governed by customer settings, contractual arrangements, and our documented data handling procedures.',
      'Deletion requests may be subject to lawful retention obligations, backup recovery processes, and other applicable limitations.',
    ],
  },
  {
    id: 'security',
    title: 'Data Security',
    paragraphs: [
      'We take reasonable technical and organizational measures designed to protect information against unauthorized access, alteration, loss, disclosure, and misuse.',
      'Our security practices are intended to address risks associated with the nature of the information and the operation of the Services.',
      'However, no internet-based platform, transmission method, or storage system can be guaranteed to be completely secure.',
    ],
    bullets: [
      'Access controls and authentication mechanisms.',
      'Role-based permissions for authorized users.',
      'Security monitoring and operational logging.',
      'Appropriate safeguards for information in transit and storage.',
      'Procedures for investigating and responding to security incidents.',
      'Periodic review of relevant systems and security configurations.',
    ],
  },
  {
    id: 'international-transfers',
    title: 'International Data Transfers',
    paragraphs: [
      'Depending on the location of our infrastructure, service providers, and customers, information processed through Pathlens may be transferred to or accessed from jurisdictions outside the country in which it was originally collected.',
      'Where required by applicable law, we use appropriate contractual, technical, or organizational safeguards for international transfers.',
      'The applicable transfer mechanisms and safeguards depend on the jurisdictions, service arrangements, and categories of information involved.',
    ],
  },
  {
    id: 'privacy-rights',
    title: 'Your Privacy Rights',
    paragraphs: [
      'Depending on your location and applicable data protection laws, you may have rights concerning personal information relating to you.',
      'These rights may be subject to legal exceptions, identity verification, and restrictions arising from the nature of the processing.',
    ],
    bullets: [
      'Request access to personal information held about you.',
      'Request correction of inaccurate or incomplete information.',
      'Request deletion of personal information where applicable.',
      'Object to or request restrictions on certain processing activities.',
      'Withdraw consent where processing relies on consent.',
      'Request portability of personal information where supported by applicable law.',
      'Submit complaints to an appropriate data protection authority.',
    ],
  },
  {
    id: 'rights-requests',
    title: 'How to Exercise Your Rights',
    paragraphs: [
      'You may contact us using the information provided at the end of this Privacy Policy to submit an applicable privacy request concerning information for which Pathlens is responsible.',
      'We may need to verify your identity or request additional information before processing certain requests.',
      'If your request concerns analytics information collected by a website or application operated by a Pathlens customer, you should generally contact that website or application operator directly.',
      'Where appropriate and required, we will assist customers in responding to requests relating to information processed on their behalf.',
    ],
  },
  {
    id: 'children',
    title: "Children's Privacy",
    paragraphs: [
      'Pathlens is intended for business and professional use and is not designed to be directed toward children.',
      'We do not knowingly solicit personal information directly from children through our account registration processes.',
      'Customers are responsible for ensuring that their deployment of Pathlens analytics technologies complies with applicable requirements relating to children and age-restricted audiences.',
      'If you believe personal information relating to a child has been processed unlawfully through our own operations, please contact us.',
    ],
  },
  {
    id: 'automated-insights',
    title: 'Automated Analytics and Insights',
    paragraphs: [
      'Pathlens may provide automated reports, summaries, recommendations, or insights based on information available within the Services.',
      'These features are intended to help customers interpret analytics information and understand usage patterns.',
      'Automated insights may contain estimates, inaccuracies, or incomplete interpretations and should not be treated as definitive assessments of an individual.',
      'Where applicable law restricts automated decision-making involving personal information, relevant processing must comply with those requirements.',
    ],
  },
  {
    id: 'changes',
    title: 'Changes to This Privacy Policy',
    paragraphs: [
      'We may update this Privacy Policy periodically to reflect changes in our Services, processing practices, legal requirements, or operational procedures.',
      'When material changes occur, we will provide appropriate notice through the Services, email, or another suitable communication channel where required by law.',
      'The date displayed at the beginning of this Privacy Policy indicates when it was most recently updated.',
      'We encourage users to review this page periodically to understand how information is handled.',
    ],
  },
  {
    id: 'contact',
    title: 'Contact Information',
    paragraphs: [
      'If you have questions about this Privacy Policy, our privacy practices, or the handling of personal information, you may contact us using the details below.',
      'Please provide sufficient information about your inquiry so that we can identify the relevant account, service, or processing activity and respond appropriately.',
    ],
  },
]

function RouteComponent() {
  const [activeSection, setActiveSection] = useState(sections[0].id)

  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})

  const scrollTargetRef = useRef<string | null>(null)

  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const sectionElements = sections
      .map((section) => sectionRefs.current[section.id])
      .filter((element): element is HTMLElement => Boolean(element))

    const getActiveSection = () => {
      if (scrollTargetRef.current) return

      const offset = 160

      let currentSection = sections[0].id

      for (const element of sectionElements) {
        const rect = element.getBoundingClientRect()

        if (rect.top <= offset) {
          currentSection = element.dataset.sectionId ?? currentSection
        } else {
          break
        }
      }

      const reachedBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 8

      if (reachedBottom) {
        currentSection = sections[sections.length - 1].id
      }

      setActiveSection(currentSection)
    }

    const observer = new IntersectionObserver(
      () => {
        getActiveSection()
      },
      {
        root: null,
        rootMargin: '-120px 0px -55% 0px',
        threshold: 0,
      }
    )

    sectionElements.forEach((element) => {
      observer.observe(element)
    })

    window.addEventListener('scroll', getActiveSection, {
      passive: true,
    })

    window.addEventListener('resize', getActiveSection)

    getActiveSection()

    return () => {
      observer.disconnect()

      window.removeEventListener('scroll', getActiveSection)
      window.removeEventListener('resize', getActiveSection)

      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [])

  const scrollToSection = (id: string) => {
    const element = sectionRefs.current[id]

    if (!element) return

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }

    scrollTargetRef.current = id
    setActiveSection(id)

    const offset = 120

    const elementTop = element.getBoundingClientRect().top + window.scrollY

    const targetTop = Math.max(0, elementTop - offset)

    window.scrollTo({
      top: targetTop,
      behavior: 'smooth',
    })

    scrollTimeoutRef.current = setTimeout(() => {
      scrollTargetRef.current = null
    }, 700)
  }

  return (
    <HomeLayout>
      <DotLayout className="border-x-2 border-dashed">
        <div className="bg-background mx-auto min-h-screen border-dashed px-5 py-20 md:max-w-[75%] md:border-x-2 md:px-8">
          {/* Header */}
          <div className="border-border space-y-2 border-b border-dashed pb-12">
            <h1 className="text-4xl font-medium tracking-tight md:text-5xl">
              Privacy Policy
            </h1>

            <p className="text-muted-foreground max-w-2xl text-sm leading-7">
              Learn how Pathlens collects, processes, protects, and manages
              information across our analytics platform and related services.
            </p>

            <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-xs">
              <span>Last updated: {LAST_UPDATED}</span>

              <span className="bg-border size-1 rounded-full" />

              <span>Effective upon publication</span>
            </div>
          </div>

          {/* Content */}
          <div className="grid grid-cols-1 gap-12 pt-12 lg:grid-cols-[210px_minmax(0,1fr)] lg:gap-14">
            {/* Sticky Table of Contents */}
            <aside className="hidden lg:block">
              <div className="sticky top-24">
                <p className="text-muted-foreground mb-5 text-xs font-medium tracking-wider uppercase">
                  On this page
                </p>

                <nav
                  aria-label="Table of contents"
                  className="border-border flex flex-col gap-1 border-l"
                >
                  {sections.map((section, index) => {
                    const isActive = activeSection === section.id

                    return (
                      <button
                        key={section.id}
                        type="button"
                        onClick={() => scrollToSection(section.id)}
                        aria-current={isActive ? 'location' : undefined}
                        className={`-ml-px cursor-pointer border-l-2 px-4 py-2 text-left text-xs leading-5 transition-all duration-200 ${
                          isActive
                            ? 'border-primary bg-primary/5 text-primary font-medium'
                            : 'text-muted-foreground hover:text-foreground hover:bg-accent/30 border-transparent'
                        }`}
                      >
                        {String(index + 1).padStart(2, '0')}. {section.title}
                      </button>
                    )
                  })}
                </nav>
              </div>
            </aside>

            {/* Privacy Document */}
            <article className="min-w-0">
              <div className="space-y-12">
                {sections.map((section, index) => (
                  <section
                    key={section.id}
                    id={section.id}
                    ref={(element) => {
                      sectionRefs.current[section.id] = element
                    }}
                    data-section-id={section.id}
                    className="space-y-5"
                  >
                    <div className="flex items-start gap-4">
                      <span className="text-muted-foreground pt-1 font-mono text-xs">
                        {String(index + 1).padStart(2, '0')}
                      </span>

                      <h2 className="text-xl font-medium tracking-tight md:text-2xl">
                        {section.title}
                      </h2>
                    </div>

                    <div className="space-y-4">
                      {section.paragraphs.map((paragraph, paragraphIndex) => (
                        <p
                          key={paragraphIndex}
                          className="text-muted-foreground text-sm leading-7"
                        >
                          {paragraph}
                        </p>
                      ))}

                      {section.bullets && (
                        <ul className="text-muted-foreground space-y-3 pl-5">
                          {section.bullets.map((bullet, bulletIndex) => (
                            <li
                              key={bulletIndex}
                              className="marker:text-muted-foreground/50 list-disc pl-1 text-sm leading-7"
                            >
                              {bullet}
                            </li>
                          ))}
                        </ul>
                      )}

                      {section.id === 'contact' && (
                        <a
                          href={`mailto:${CONTACT_EMAIL}`}
                          className="group text-foreground inline-flex items-center gap-2 text-sm underline underline-offset-4"
                        >
                          {CONTACT_EMAIL}

                          <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                        </a>
                      )}
                    </div>

                    {index !== sections.length - 1 && (
                      <div className="border-border border-b border-dashed pt-7" />
                    )}
                  </section>
                ))}
              </div>

              {/* Footer Notice */}
              <div className="border-border mt-16 border-t border-dashed pt-8">
                <p className="text-muted-foreground text-xs leading-6">
                  For more information about your responsibilities when using
                  Pathlens, please review our{' '}
                  <a
                    href="/terms"
                    className="text-foreground hover:text-primary underline underline-offset-4 transition-colors"
                  >
                    Terms of Service
                  </a>
                  .
                </p>

                <button
                  type="button"
                  onClick={() => scrollToSection(sections[0].id)}
                  className="text-foreground hover:text-primary mt-6 inline-flex cursor-pointer items-center gap-2 text-xs transition-colors"
                >
                  Back to top
                  <ArrowUpRight className="size-3" />
                </button>
              </div>
            </article>
          </div>
        </div>
      </DotLayout>
    </HomeLayout>
  )
}
