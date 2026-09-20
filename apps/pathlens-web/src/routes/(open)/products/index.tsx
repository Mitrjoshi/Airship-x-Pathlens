import { createFileRoute, Link } from '@tanstack/react-router'
import { HomeLayout } from '../-components/home-layout'
import { DotLayout } from '../-components/dot-layout'
import { TitleReveal } from './$productId/-components/title-reveal'
import { productSections } from './-constants/products'
import { useState } from 'react'
import { motion } from 'motion/react'
import { ArrowUpRightIcon } from 'lucide-react'

export const Route = createFileRoute('/(open)/products/')({
  component: RouteComponent,
})

function RouteComponent() {
  const [activeTab, setActiveTab] = useState(-1)

  return (
    <div>
      <HomeLayout>
        <DotLayout className="border-x-2 border-dashed">
          <div className="bg-background mx-auto w-[75%] space-y-20 border-x-2 border-dashed py-20">
            <TitleReveal
              className="flex flex-col gap-2 text-center"
              title="Pathlens products"
              description="Everything you need to understand your website, uncover user behavior, and turn real-world activity into better digital experiences."
            />

            <div className="space-y-10">
              <div className="mx-auto flex w-fit items-center rounded-full border p-1">
                {/* All tab */}
                <button
                  onClick={() => setActiveTab(-1)}
                  className="hover:bg-secondary relative cursor-pointer rounded-full px-4 py-2 duration-150"
                >
                  {activeTab === -1 && (
                    <motion.div
                      layoutId="active-tab-pill"
                      className="bg-primary absolute inset-0 rounded-full"
                      transition={{
                        type: 'spring',
                        stiffness: 380,
                        damping: 30,
                      }}
                    />
                  )}

                  <span
                    className={`relative z-10 transition-colors duration-200 ${
                      activeTab === -1 ? 'text-black' : 'text-muted-foreground'
                    }`}
                  >
                    All Products
                  </span>
                </button>

                {/* Product tabs */}
                {productSections.map((item, index) => {
                  const isActive = activeTab === index

                  return (
                    <button
                      key={item.title}
                      onClick={() => setActiveTab(index)}
                      className="hover:bg-secondary relative cursor-pointer rounded-full px-4 py-2 duration-150"
                    >
                      {isActive && (
                        <motion.div
                          layoutId="active-tab-pill"
                          className="bg-primary absolute inset-0 rounded-full"
                          transition={{
                            type: 'spring',
                            stiffness: 380,
                            damping: 30,
                          }}
                        />
                      )}

                      <span
                        className={`relative z-10 transition-colors duration-200 ${
                          isActive ? 'text-black' : 'text-muted-foreground'
                        }`}
                      >
                        {item.title}
                      </span>
                    </button>
                  )
                })}
              </div>

              <div className="space-y-10 px-10">
                {productSections
                  .filter((_, index) => activeTab === -1 || index === activeTab)
                  .map((item, index) => (
                    <div key={index}>
                      <p className="text-muted-foreground px-3 pb-2">
                        {item.title}
                      </p>

                      <div className="nut-all grid grid-cols-4 divide-y border">
                        {item.items.map((p, index) => {
                          const isLastColumn = (index + 1) % 4 === 0
                          const isLastRow = index >= item.items.length - 4

                          return (
                            <Link
                              to="/products/$productId"
                              params={{
                                productId: p.title
                                  .replace(' ', '-')
                                  .toLowerCase(),
                              }}
                              key={index}
                              className={`group p-6 duration-200 ${
                                !isLastColumn ? 'border-r' : ''
                              } ${!isLastRow ? 'border-b' : ''}`}
                            >
                              <p.icon
                                className="group-hover:text-primary duration-200"
                                size={24}
                              />

                              <p className="mt-4 text-lg">{p.title}</p>

                              <p className="text-muted-foreground text-sm">
                                {p.description}
                              </p>

                              <p className="group-hover:text-primary text-muted-foreground mt-8 flex items-center gap-1 text-sm underline-offset-2 duration-200 group-hover:underline">
                                See Product{' '}
                                <span className="inline-block">
                                  <ArrowUpRightIcon size={15} />
                                </span>
                              </p>
                            </Link>
                          )
                        })}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </DotLayout>
      </HomeLayout>
    </div>
  )
}
