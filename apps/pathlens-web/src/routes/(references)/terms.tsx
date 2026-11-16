import { createFileRoute } from '@tanstack/react-router'
import { HomeLayout } from '../(open)/-components/home-layout'
import { DotLayout } from '../(open)/-components/dot-layout'
import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight } from 'lucide-react'

export const Route = createFileRoute('/(references)/terms')({
  component: RouteComponent,
})

const LAST_UPDATED = 'November 16, 2026'
const CONTACT_EMAIL = 'legal@pathlens.com' // Replace with verified email.
const LEGAL_ENTITY = '[Pathlens legal entity name]'
const GOVERNING_JURISDICTION = '[Applicable jurisdiction]'

const sections = [
  {
    id: 'acceptance',
    title: 'Acceptance of Terms',
    paragraphs: [
      `These Terms of Service ("Terms") govern your access to and use of Pathlens, including its websites, dashboards, APIs, tracking scripts, integrations, documentation, and related services (collectively, the "Services"). The Services are provided by ${LEGAL_ENTITY} ("Pathlens", "we", "us", or "our").`,
      'By creating an account, accessing, or using the Services, you agree to be bound by these Terms and our applicable policies. If you use the Services on behalf of an organization, you represent that you have authority to bind that organization to these Terms.',
      'If you do not agree to these Terms, you must not access or use the Services.',
    ],
  },
  {
    id: 'services',
    title: 'Description of Services',
    paragraphs: [
      'Pathlens is a web analytics and behavioral insights platform designed to help businesses understand how visitors interact with their websites and digital experiences.',
      'Depending on the features available to your account, the Services may include event tracking, visitor analytics, project management, analytics dashboards, reports, integrations, and automated insights.',
      'We may improve, modify, introduce, or discontinue features from time to time. Material changes affecting paid features will be handled in accordance with applicable law and any commitments made in your subscription agreement.',
    ],
  },
  {
    id: 'accounts',
    title: 'Accounts and Registration',
    paragraphs: [
      'Certain features require a registered Pathlens account. You agree to provide accurate and current registration information and maintain the confidentiality of your login credentials.',
      'You are responsible for activities conducted through your account, except to the extent caused by circumstances for which Pathlens is legally responsible.',
    ],
    bullets: [
      'Use accurate account and organization information.',
      'Maintain appropriate security for your credentials and access tokens.',
      'Notify us promptly if you suspect unauthorized access.',
      'Manage project members and their permissions responsibly.',
      'Do not share credentials or permit unauthorized account access.',
    ],
  },
  {
    id: 'tracking',
    title: 'Tracking Scripts and Website Data',
    paragraphs: [
      'Pathlens may provide JavaScript tracking scripts, SDKs, APIs, or similar technologies for collecting analytics events from websites and applications under your control.',
      'You may deploy these technologies only on websites, applications, and domains that you own or are expressly authorized to monitor.',
      'You are responsible for configuring the tracking implementation, defining appropriate events, and ensuring that the information collected through your projects is lawful and appropriate for your intended purposes.',
      'Project-level domain settings and other technical controls do not replace your responsibility to obtain authorization to monitor a website or application.',
    ],
    bullets: [
      'Do not deploy Pathlens tracking technology on unauthorized properties.',
      'Do not intentionally submit passwords, authentication tokens, payment card numbers, government identifiers, or similarly sensitive information through analytics events.',
      'Do not use the Services to collect information prohibited by applicable law or your agreements with website visitors.',
      'Do not circumvent tracking restrictions, security controls, or project permissions.',
      'Review custom event properties and tracking configurations before deployment.',
    ],
  },
  {
    id: 'privacy',
    title: 'Privacy and Data Protection',
    paragraphs: [
      'You are responsible for determining the legal basis for analytics collection and for providing any privacy notices, consent mechanisms, and user rights procedures required under applicable data protection laws.',
      'Where you determine the purposes and means of processing visitor analytics data, you are generally responsible for that processing. Pathlens processes information in connection with providing the Services, subject to the applicable contractual arrangements and privacy documentation.',
      'You must ensure that your use of Pathlens complies with applicable privacy, electronic communications, cookie, and data protection requirements.',
      'Where required, you must obtain appropriate consent before activating analytics tracking and respect applicable consent withdrawals and tracking preferences.',
      'Our Privacy Policy provides additional information about how Pathlens handles personal information in connection with its own operations.',
    ],
  },
  {
    id: 'acceptable-use',
    title: 'Acceptable Use',
    paragraphs: [
      'You agree not to misuse the Services or interfere with their security, integrity, availability, or operation.',
    ],
    bullets: [
      'Access accounts, projects, or information without authorization.',
      'Attempt to bypass authentication, authorization, usage limits, or security controls.',
      'Introduce malicious software, harmful code, or abusive traffic.',
      'Use the Services for unlawful surveillance, harassment, discrimination, or other unlawful activities.',
      'Reverse engineer or attempt to extract proprietary components except where permitted by applicable law.',
      'Resell or redistribute the Services without authorization.',
      'Use automated means to overload or disrupt Pathlens infrastructure.',
      'Misrepresent your identity, ownership, or authorization to track a digital property.',
    ],
  },
  {
    id: 'customer-data',
    title: 'Customer Data and Ownership',
    paragraphs: [
      'As between you and Pathlens, you retain your rights to the analytics events, project configurations, and other content you submit to the Services ("Customer Data").',
      'You grant Pathlens a limited right to host, process, transmit, and otherwise use Customer Data as necessary to operate, maintain, secure, and provide the Services and fulfill our contractual obligations.',
      'You represent that you have the necessary rights and permissions to provide Customer Data to Pathlens and authorize its processing.',
      'You remain responsible for the accuracy, legality, quality, and collection practices associated with Customer Data.',
    ],
  },
  {
    id: 'integrations',
    title: 'Third-Party Integrations',
    paragraphs: [
      'Pathlens may support integrations with external platforms, including messaging, collaboration, reporting, authentication, or other third-party services.',
      'Your use of third-party services remains subject to their respective terms and privacy policies. You are responsible for reviewing the permissions and data shared when enabling an integration.',
      'We do not control third-party services and are not responsible for their independent operation, availability, or changes, except where applicable law provides otherwise.',
    ],
  },
  {
    id: 'billing',
    title: 'Subscriptions and Payments',
    paragraphs: [
      'Pathlens may offer free and paid plans with different features, limits, and subscription conditions. The price, billing period, and included features applicable to your subscription will be presented at the time of purchase or in your applicable order.',
      'If you purchase a recurring subscription, its renewal and cancellation conditions will be disclosed during checkout or in the applicable subscription agreement.',
      'Any applicable taxes, refund eligibility, and consequences of payment failure will be governed by the terms disclosed with your purchase and applicable law.',
      'We will not charge a subscription fee without an applicable payment authorization.',
    ],
  },
  {
    id: 'availability',
    title: 'Service Availability',
    paragraphs: [
      'We aim to provide reliable access to Pathlens, but the Services may occasionally be unavailable due to maintenance, updates, infrastructure failures, security incidents, or circumstances outside our reasonable control.',
      'Unless expressly agreed in a separate service level agreement, we do not guarantee uninterrupted availability or a particular uptime percentage.',
      'Analytics delivery and reporting may be affected by browser restrictions, network connectivity, ad blockers, client-side configuration, third-party outages, and other technical conditions.',
    ],
  },
  {
    id: 'insights',
    title: 'Analytics Accuracy and Insights',
    paragraphs: [
      'Analytics data, dashboards, reports, and automated insights are provided to help you understand activity and trends. They may contain inaccuracies, omissions, delays, estimates, or incomplete information.',
      'You acknowledge that collected events may not represent every visitor interaction or accurately identify every visitor.',
      'Automated insights and recommendations are informational and should be reviewed before being used to make material business, financial, or operational decisions.',
      'Pathlens does not guarantee specific traffic, conversion, revenue, or business outcomes from using the Services.',
    ],
  },
  {
    id: 'intellectual-property',
    title: 'Intellectual Property',
    paragraphs: [
      'Pathlens and its licensors retain their respective rights in the Services, including the software, interface designs, documentation, trademarks, and underlying technology.',
      'Subject to these Terms and your applicable subscription, we grant you a limited, non-exclusive, non-transferable right to access and use the Services for your internal business purposes.',
      'These Terms do not transfer ownership of Pathlens intellectual property to you. Your ownership rights in Customer Data remain subject to the Customer Data section above.',
      'If you provide suggestions or feedback, you permit us to use that feedback to improve the Services without an obligation to compensate you, provided we do not thereby acquire ownership of your Customer Data.',
    ],
  },
  {
    id: 'suspension',
    title: 'Suspension and Termination',
    paragraphs: [
      'You may stop using Pathlens at any time and may request account closure through the available account controls or by contacting us.',
      'We may suspend or restrict access when reasonably necessary to address security risks, suspected unauthorized activity, material violations of these Terms, or legal obligations.',
      'Where reasonable and legally permitted, we will provide notice and an opportunity to address the issue before a material suspension or termination.',
      'Upon termination, access to the Services may end. The handling, export, retention, and deletion of Customer Data will be governed by applicable contractual terms, our documented retention practices, and applicable law.',
    ],
  },
  {
    id: 'disclaimers',
    title: 'Disclaimers',
    paragraphs: [
      'To the extent permitted by applicable law, and except as expressly provided in a separate written agreement, the Services are provided on an "as is" and "as available" basis.',
      'We disclaim implied warranties to the extent such disclaimers are legally permitted, including implied warranties of merchantability, fitness for a particular purpose, and non-infringement.',
      'Nothing in these Terms excludes warranties, guarantees, remedies, or other rights that cannot lawfully be excluded.',
    ],
  },
  {
    id: 'liability',
    title: 'Limitation of Liability',
    paragraphs: [
      'To the maximum extent permitted by applicable law, neither party will be liable to the other for indirect, incidental, special, consequential, or punitive damages arising from these Terms or use of the Services, except where such exclusions are prohibited by law.',
      'Any aggregate monetary liability cap, exclusions from that cap, and related risk allocation should be stated in the applicable order or a separately agreed written contract. Until those terms are finalized, this section does not establish a specific monetary cap.',
      'Nothing in these Terms limits liability that cannot legally be limited, including any liability for which exclusion is prohibited under applicable law.',
    ],
  },
  {
    id: 'indemnification',
    title: 'Indemnification',
    paragraphs: [
      'To the extent permitted by applicable law, you agree to defend and indemnify Pathlens against third-party claims arising from your unlawful collection of Customer Data, unauthorized deployment of tracking technologies, or material violation of these Terms, to the extent those claims are attributable to your actions or omissions.',
      'This obligation is subject to any applicable contractual limitations and does not require you to indemnify Pathlens for its own unlawful conduct.',
    ],
  },
  {
    id: 'changes',
    title: 'Changes to These Terms',
    paragraphs: [
      'We may update these Terms to reflect changes to the Services, applicable laws, or business practices.',
      'When changes are material, we will provide notice through an appropriate channel before the changes take effect, as required by applicable law.',
      'The date at the top of this page identifies the most recent version. Your continued use after revised Terms take effect constitutes acceptance only to the extent permitted by applicable law.',
    ],
  },
  {
    id: 'governing-law',
    title: 'Governing Law',
    paragraphs: [
      `These Terms are governed by the laws of ${GOVERNING_JURISDICTION}, without prejudice to mandatory legal protections that apply to you.`,
      'Any dispute resolution procedure, court jurisdiction, or arbitration arrangement will be governed by the provisions agreed between the parties and applicable law.',
    ],
  },
  {
    id: 'contact',
    title: 'Contact Information',
    paragraphs: [
      'If you have questions about these Terms, contractual obligations, or your use of Pathlens, you can contact us using the information below.',
    ],
  },
]

function RouteComponent() {
  const [activeSection, setActiveSection] = useState(sections[0].id)

  // Stores references to every document section.
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})

  // Prevents scroll observation from overriding the clicked
  // item while smooth scrolling is in progress.
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

      // When reaching the bottom, highlight the last section.
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

    // Release manual selection after smooth scroll finishes.
    scrollTimeoutRef.current = setTimeout(() => {
      scrollTargetRef.current = null
    }, 700)
  }

  return (
    <HomeLayout>
      <DotLayout className="border-x-2 border-dashed">
        <div className="bg-background mx-auto min-h-screen border-dashed px-5 py-20 md:max-w-[75%] md:border-x-2 md:px-8">
          {/* Header */}
          <div className="border-border border-b border-dashed pb-12 md:space-y-2">
            <h1 className="text-4xl font-medium tracking-tight md:text-5xl">
              Terms of Service
            </h1>

            <p className="text-muted-foreground max-w-2xl text-sm leading-7">
              These Terms of Service outline the rules, responsibilities, and
              conditions governing your access to and use of the Pathlens
              platform.
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

            {/* Legal Document */}
            <article className="min-w-0">
              <div className="space-y-12">
                {sections.map((section, index) => (
                  <section
                    key={section.id}
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

                      {'bullets' in section && section.bullets && (
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
                  By continuing to access or use Pathlens, you acknowledge that
                  you have read and understood these Terms of Service.
                </p>

                <button
                  type="button"
                  onClick={() => {
                    scrollToSection(sections[0].id)
                  }}
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
