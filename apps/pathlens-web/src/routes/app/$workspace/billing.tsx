import {
  ProjectPageHeader,
  ProjectPanel,
  SectionHeader,
} from '@/components/common/project-page'
import { PageLayout } from '@/components/common/page-layout'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { useState } from 'react'
import {
  CalendarDays,
  Check,
  CreditCard,
  Download,
  Loader2,
  MoreHorizontal,
  Plus,
  Receipt,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from 'lucide-react'

import {
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'
import { Badge } from '@workspace/ui/components/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@workspace/ui/components/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { cn } from '@workspace/ui/lib/utils'
import { getPlanDefinition, PLAN_TIERS, useWorkspacePlan } from '@/lib/billing'

export const Route = createFileRoute('/app/$workspace/billing')({
  component: RouteComponent,
  staticData: {
    breadcrumb: 'Billing',
  },
})

const addressSchema = z.object({
  companyName: z.string().min(2, 'Company name must be at least 2 characters'),
  addressLine1: z.string().min(3, 'Address is required'),
  city: z.string().min(2, 'City is required'),
  postalCode: z.string().min(3, 'Postal code is required'),
  country: z.string().min(2, 'Country is required'),
  taxId: z.string(),
})

function FieldError({
  errors,
}: {
  errors: Array<{ message?: string } | string | undefined>
}) {
  if (!errors.length) return null

  return (
    <p className="text-destructive text-sm">
      {typeof errors[0] === 'string' ? errors[0] : errors[0]?.message}
    </p>
  )
}

interface PaymentMethod {
  id: string
  brand: 'Visa' | 'Mastercard' | 'Amex'
  last4: string
  expiry: string
  default: boolean
}

const paymentMethods: PaymentMethod[] = [
  { id: 'pm_1', brand: 'Visa', last4: '4242', expiry: '08/28', default: true },
  {
    id: 'pm_2',
    brand: 'Mastercard',
    last4: '8210',
    expiry: '03/27',
    default: false,
  },
]

interface Invoice {
  id: string
  date: string
  status: 'Paid' | 'Pending' | 'Failed'
}

const invoices: Invoice[] = [
  {
    id: 'INV-2026-007',
    date: 'Jul 1, 2026',
    status: 'Paid',
  },
  {
    id: 'INV-2026-006',
    date: 'Jun 1, 2026',
    status: 'Paid',
  },
  {
    id: 'INV-2026-005',
    date: 'May 1, 2026',
    status: 'Paid',
  },
  {
    id: 'INV-2026-004',
    date: 'Apr 1, 2026',
    status: 'Paid',
  },
  {
    id: 'INV-2026-003',
    date: 'Mar 1, 2026',
    status: 'Failed',
  },
]

const upcomingInvoice = {
  date: 'Aug 26, 2026',
}

function formatPrice(price: number): string {
  return price === 0 ? 'Free' : `$${price.toFixed(2)}`
}

function statusVariant(status: Invoice['status']) {
  if (status === 'Paid') {
    return 'border-green-500/30 bg-green-500/10 text-green-600'
  }

  if (status === 'Pending') {
    return 'border-yellow-500/30 bg-yellow-500/10 text-yellow-600'
  }

  return 'border-red-500/30 bg-red-500/10 text-red-600'
}

function RouteComponent() {
  const [isSaving, setIsSaving] = useState(false)
  const { workspace } = Route.useParams()
  const currentPlanId = useWorkspacePlan(workspace)
  const currentPlan = getPlanDefinition(currentPlanId)

  const addressForm = useForm({
    defaultValues: {
      companyName: 'ADSMN Interactive',
      addressLine1: '',
      city: '',
      postalCode: '',
      country: 'India',
      taxId: '',
    },
    validators: {
      onChange: addressSchema,
    },
    onSubmit: async ({ value }) => {
      setIsSaving(true)
      // TODO: wire to update-billing-address mutation
      await new Promise((resolve) => setTimeout(resolve, 800))
      console.log(value)
      setIsSaving(false)
    },
  })

  return (
    <PageLayout>
      <div className="space-y-8">
        <ProjectPageHeader
          eyebrow="Workspace billing"
          title="Billing & invoices."
          description="Keep your plan, payment details, and receipts in one clear place."
          actions={
            <Badge variant="outline" className="w-fit">
              {currentPlan.name} plan · Active
            </Badge>
          }
        />

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(18rem,0.7fr)]">
          <ProjectPanel className="border-foreground/20 relative overflow-hidden">
            <div className="bg-foreground absolute inset-x-0 top-0 h-1" />
            <CardContent className="p-5 pt-6 sm:p-6 sm:pt-7">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-muted-foreground flex items-center gap-2 text-xs font-medium tracking-[0.16em] uppercase">
                    <Sparkles className="size-3.5" />
                    Active subscription
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2.5">
                    <h2 className="text-2xl font-semibold tracking-tight">
                      {currentPlan.name}
                    </h2>
                    <Badge className="bg-green-500/15 text-green-600 hover:bg-green-500/15">
                      Active
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mt-2 max-w-lg text-sm leading-6">
                    {currentPlan.description} Your workspace is ready for the
                    next signal.
                  </p>
                </div>

                <div className="sm:text-right">
                  <p className="text-muted-foreground text-xs">Current rate</p>
                  <p className="mt-1 text-3xl font-semibold tracking-tight">
                    {formatPrice(currentPlan.price)}
                    {currentPlan.price > 0 && (
                      <span className="text-muted-foreground text-sm font-normal">
                        /mo
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-3 border-t pt-5 sm:grid-cols-3">
                <div>
                  <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                    <CalendarDays className="size-3.5" />
                    Next renewal
                  </p>
                  <p className="mt-2 text-sm font-medium">
                    {currentPlan.price === 0 ? 'No renewal' : 'Aug 26, 2026'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                    <Receipt className="size-3.5" />
                    Next charge
                  </p>
                  <p className="mt-2 text-sm font-medium">
                    {currentPlan.price === 0
                      ? 'No payment due'
                      : formatPrice(currentPlan.price)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                    <ShieldCheck className="size-3.5" />
                    Data retention
                  </p>
                  <p className="mt-2 text-sm font-medium">
                    {currentPlan.limits.retentionDays} days
                  </p>
                </div>
              </div>
            </CardContent>
          </ProjectPanel>

          <ProjectPanel className="bg-muted/30">
            <CardHeader className="px-5 py-5 sm:px-6">
              <div className="flex items-start gap-3">
                <span className="bg-background text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-xl border">
                  <Receipt className="size-4" />
                </span>
                <div>
                  <CardTitle>Next invoice</CardTitle>
                  <CardDescription className="mt-1">
                    Your next scheduled subscription payment.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 px-5 pb-5 sm:px-6 sm:pb-6">
              <div className="bg-background rounded-xl border p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">
                      {currentPlan.name} plan
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {currentPlan.price === 0
                        ? 'No payment required'
                        : `Due ${upcomingInvoice.date}`}
                    </p>
                  </div>
                  <p className="text-lg font-semibold tracking-tight">
                    {formatPrice(currentPlan.price)}
                  </p>
                </div>
              </div>
              <p className="text-muted-foreground flex items-start gap-2 text-xs leading-5">
                <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
                You can change or cancel your plan at any time. No long-term
                commitment.
              </p>
            </CardContent>
          </ProjectPanel>
        </div>

        <section id="plan-options" className="space-y-4">
          <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-muted-foreground text-xs font-medium tracking-[0.18em] uppercase">
                Plan options
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                Match the plan to your signal.
              </h2>
              <p className="text-muted-foreground mt-2 text-sm">
                Upgrade for more depth, or keep it simple while you are getting
                started.
              </p>
            </div>
            <Badge variant="outline" className="w-fit">
              <Check /> Change anytime
            </Badge>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {PLAN_TIERS.map((tier) => {
              const isCurrent = tier.id === currentPlan.id

              return (
                <ProjectPanel
                  key={tier.id}
                  className={cn(
                    'flex flex-col',
                    tier.highlighted &&
                      'border-foreground/40 ring-foreground/10 ring-1'
                  )}
                >
                  {tier.highlighted && (
                    <div className="bg-foreground text-background px-5 py-1.5 text-[11px] font-medium tracking-[0.16em] uppercase">
                      Recommended for growing teams
                    </div>
                  )}
                  <CardHeader className="border-b px-5 py-5">
                    <div className="flex items-center justify-between gap-3">
                      <CardTitle>{tier.name}</CardTitle>
                      {isCurrent ? (
                        <Badge>Current</Badge>
                      ) : tier.highlighted ? (
                        <Badge variant="outline">Popular</Badge>
                      ) : null}
                    </div>
                    <CardDescription className="mt-2 min-h-10 leading-5">
                      {tier.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="flex flex-1 flex-col gap-5 p-5">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-semibold tracking-tight">
                        {formatPrice(tier.price)}
                      </span>
                      <span className="text-muted-foreground text-sm">
                        {tier.price === 0 ? 'forever' : '/mo'}
                      </span>
                    </div>

                    <ul className="space-y-2.5 text-sm">
                      {tier.features.slice(0, 5).map((feature) => (
                        <li
                          key={feature}
                          className="text-muted-foreground flex items-start gap-2"
                        >
                          <Check className="text-foreground mt-0.5 size-3.5 shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-auto pt-2">
                      {isCurrent ? (
                        <Button variant="outline" className="w-full" disabled>
                          Current plan
                        </Button>
                      ) : (
                        <Button
                          className="w-full"
                          render={
                            <Link
                              to="/app/$workspace/checkout/$plan"
                              params={{ workspace, plan: tier.id }}
                            />
                          }
                        >
                          {tier.id === 'starter'
                            ? 'Switch to Starter'
                            : `Choose ${tier.name}`}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </ProjectPanel>
              )
            })}
          </div>
        </section>

        <section className="space-y-4">
          <SectionHeader
            title="Payment & billing details"
            description="Keep your payment method and invoice details up to date."
          />

          <div className="grid gap-6 xl:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)]">
            <ProjectPanel className="h-fit">
              <CardHeader className="flex flex-col gap-4 border-b px-5 py-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle>Payment methods</CardTitle>
                  <CardDescription className="mt-1">
                    Cards used for your subscription.
                  </CardDescription>
                </div>

                <Dialog>
                  <DialogTrigger
                    render={
                      <Button className="self-start">
                        <Plus />
                        Add card
                      </Button>
                    }
                  />

                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add a payment method</DialogTitle>
                      <DialogDescription>
                        Your card details are handled securely by our payment
                        provider.
                      </DialogDescription>
                    </DialogHeader>

                    <form
                      className="space-y-4"
                      onSubmit={(event) => event.preventDefault()}
                    >
                      <div className="space-y-2">
                        <Label htmlFor="card-number">Card number</Label>
                        <Input
                          id="card-number"
                          placeholder="1234 5678 9012 3456"
                          autoComplete="cc-number"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="card-expiry">Expiry</Label>
                          <Input
                            id="card-expiry"
                            placeholder="MM/YY"
                            autoComplete="cc-exp"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="card-cvc">CVC</Label>
                          <Input
                            id="card-cvc"
                            placeholder="123"
                            autoComplete="cc-csc"
                          />
                        </div>
                      </div>

                      <DialogFooter>
                        <Button type="submit">Save card</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>

              <CardContent className="space-y-3 p-5">
                {paymentMethods.map((method) => (
                  <div
                    key={method.id}
                    className="bg-muted/20 flex items-center justify-between gap-3 rounded-xl border p-3.5"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="bg-background text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-xl border">
                        <CreditCard className="size-4" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                          <span>
                            {method.brand} •••• {method.last4}
                          </span>
                          {method.default && (
                            <Badge variant="outline">Default</Badge>
                          )}
                        </div>
                        <div className="text-muted-foreground mt-1 text-xs">
                          Expires {method.expiry}
                        </div>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Actions for ${method.brand} ending in ${method.last4}`}
                          />
                        }
                      >
                        <MoreHorizontal />
                      </DropdownMenuTrigger>

                      <DropdownMenuContent align="end">
                        {!method.default && (
                          <DropdownMenuItem>Set as default</DropdownMenuItem>
                        )}
                        <DropdownMenuItem className="text-destructive">
                          Remove card
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}

                <p className="text-muted-foreground flex items-start gap-2 pt-1 text-xs leading-5">
                  <WalletCards className="mt-0.5 size-3.5 shrink-0" />
                  Your default card is charged automatically when a paid plan
                  renews.
                </p>
              </CardContent>
            </ProjectPanel>

            <ProjectPanel>
              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  addressForm.handleSubmit()
                }}
              >
                <CardHeader className="border-b px-5 py-5">
                  <CardTitle>Billing address</CardTitle>
                  <CardDescription className="mt-1">
                    Used on your invoices and for tax calculation.
                  </CardDescription>
                </CardHeader>

                <CardContent className="grid gap-5 p-5">
                  <addressForm.Field name="companyName">
                    {(field) => (
                      <div className="space-y-2">
                        <Label htmlFor={field.name}>Company name</Label>
                        <Input
                          id={field.name}
                          name={field.name}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(event) =>
                            field.handleChange(event.target.value)
                          }
                          autoComplete="organization"
                        />
                        <FieldError errors={field.state.meta.errors} />
                      </div>
                    )}
                  </addressForm.Field>

                  <addressForm.Field name="addressLine1">
                    {(field) => (
                      <div className="space-y-2">
                        <Label htmlFor={field.name}>Address</Label>
                        <Input
                          id={field.name}
                          name={field.name}
                          placeholder="Street address"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(event) =>
                            field.handleChange(event.target.value)
                          }
                          autoComplete="street-address"
                        />
                        <FieldError errors={field.state.meta.errors} />
                      </div>
                    )}
                  </addressForm.Field>

                  <div className="grid gap-5 md:grid-cols-2">
                    <addressForm.Field name="city">
                      {(field) => (
                        <div className="space-y-2">
                          <Label htmlFor={field.name}>City</Label>
                          <Input
                            id={field.name}
                            name={field.name}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(event) =>
                              field.handleChange(event.target.value)
                            }
                            autoComplete="address-level2"
                          />
                          <FieldError errors={field.state.meta.errors} />
                        </div>
                      )}
                    </addressForm.Field>

                    <addressForm.Field name="postalCode">
                      {(field) => (
                        <div className="space-y-2">
                          <Label htmlFor={field.name}>Postal code</Label>
                          <Input
                            id={field.name}
                            name={field.name}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(event) =>
                              field.handleChange(event.target.value)
                            }
                            autoComplete="postal-code"
                          />
                          <FieldError errors={field.state.meta.errors} />
                        </div>
                      )}
                    </addressForm.Field>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    <addressForm.Field name="country">
                      {(field) => (
                        <div className="space-y-2">
                          <Label htmlFor={field.name}>Country</Label>
                          <Select
                            value={field.state.value}
                            onValueChange={(value) => {
                              if (value) field.handleChange(value)
                            }}
                          >
                            <SelectTrigger id={field.name}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="India">India</SelectItem>
                              <SelectItem value="United States">
                                United States
                              </SelectItem>
                              <SelectItem value="United Kingdom">
                                United Kingdom
                              </SelectItem>
                              <SelectItem value="Germany">Germany</SelectItem>
                            </SelectContent>
                          </Select>
                          <FieldError errors={field.state.meta.errors} />
                        </div>
                      )}
                    </addressForm.Field>

                    <addressForm.Field name="taxId">
                      {(field) => (
                        <div className="space-y-2">
                          <Label htmlFor={field.name}>
                            Tax ID{' '}
                            <span className="text-muted-foreground">
                              (optional)
                            </span>
                          </Label>
                          <Input
                            id={field.name}
                            name={field.name}
                            placeholder="GSTIN / VAT number"
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(event) =>
                              field.handleChange(event.target.value)
                            }
                          />
                        </div>
                      )}
                    </addressForm.Field>
                  </div>
                </CardContent>

                <CardFooter className="justify-end border-t px-5 py-4">
                  <addressForm.Subscribe
                    selector={(state) => [state.canSubmit, state.isSubmitting]}
                  >
                    {([canSubmit, isSubmitting]) => (
                      <Button type="submit" disabled={!canSubmit || isSaving}>
                        {(isSubmitting || isSaving) && (
                          <Loader2 className="animate-spin" />
                        )}
                        Save address
                      </Button>
                    )}
                  </addressForm.Subscribe>
                </CardFooter>
              </form>
            </ProjectPanel>
          </div>
        </section>

        <ProjectPanel>
          <CardHeader className="flex flex-col gap-3 border-b px-5 py-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Invoice history</CardTitle>
              <CardDescription className="mt-1">
                Download past invoices for your records.
              </CardDescription>
            </div>
            <Badge variant="outline" className="w-fit">
              {invoices.length} invoices
            </Badge>
          </CardHeader>

          <CardContent className="p-0">
            <Table className="min-w-[720px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="py-3 pl-5">Invoice</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>

              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="py-3.5 pl-5 font-mono text-xs">
                      {invoice.id}
                    </TableCell>
                    <TableCell className="py-3.5">{invoice.date}</TableCell>
                    <TableCell className="text-muted-foreground py-3.5">
                      {currentPlan.name} plan · Monthly
                    </TableCell>
                    <TableCell className="py-3.5 font-medium">
                      {formatPrice(currentPlan.price)}
                    </TableCell>
                    <TableCell className="py-3.5">
                      <Badge
                        variant="outline"
                        className={statusVariant(invoice.status)}
                      >
                        {invoice.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Download ${invoice.id}`}
                      >
                        <Download />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </ProjectPanel>
      </div>
    </PageLayout>
  )
}
