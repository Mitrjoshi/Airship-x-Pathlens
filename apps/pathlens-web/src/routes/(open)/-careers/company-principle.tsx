const values = [
  {
    title: 'Insightful',
    description:
      'We believe better digital experiences begin with understanding people. We turn real user behavior into meaningful insights that help businesses make smarter decisions.',
  },
  {
    title: 'Curious',
    description:
      "We're driven by curiosity and a desire to understand how people interact with the web. We explore every click, scroll, and journey to uncover opportunities for improvement.",
  },
  {
    title: 'Transparent',
    description:
      'We believe analytics should be clear, accessible, and trustworthy. We prioritize user privacy, honest data, and simple tools that empower everyone to make informed decisions.',
  },
]

export const CompanyPrinciple = () => {
  return (
    <div className="nut-all grid grid-cols-3 divide-x-2 divide-dashed border-x-2 border-dashed">
      {values.map((item, index) => (
        <div key={index} className="space-y-2 p-4">
          <p className="text-xl font-medium">{item.title}</p>
          <p className="text-muted-foreground text-sm">{item.description}</p>
        </div>
      ))}
    </div>
  )
}
