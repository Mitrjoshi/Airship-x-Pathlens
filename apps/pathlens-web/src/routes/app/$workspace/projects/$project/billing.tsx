import {
  ProjectPageHeader,
  ProjectPageLayout,
  ProjectPanel,
} from '@/components/common/project-page'
import { createFileRoute } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { useState } from 'react'
import {
  CreditCard,
  Download,
  Loader2,
  MoreHorizontal,
  Plus,
  Receipt,
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

export const Route = createFileRoute(
  '/app/$workspace/projects/$project/billing'
)({
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
  description: string
  amount: number
  status: 'Paid' | 'Pending' | 'Failed'
}

const invoices: Invoice[] = [
  {
    id: 'INV-2026-007',
    date: 'Jul 1, 2026',
    description: 'Pro Plan · Monthly',
    amount: 49,
    status: 'Paid',
  },
  {
    id: 'INV-2026-006',
    date: 'Jun 1, 2026',
    description: 'Pro Plan · Monthly',
    amount: 49,
    status: 'Paid',
  },
  {
    id: 'INV-2026-005',
    date: 'May 1, 2026',
    description: 'Pro Plan · Monthly',
    amount: 49,
    status: 'Paid',
  },
  {
    id: 'INV-2026-004',
    date: 'Apr 1, 2026',
    description: 'Pro Plan · Monthly',
    amount: 49,
    status: 'Paid',
  },
  {
    id: 'INV-2026-003',
    date: 'Mar 1, 2026',
    description: 'Pro Plan · Monthly',
    amount: 49,
    status: 'Failed',
  },
]

const upcomingInvoice = {
  date: 'Aug 1, 2026',
  amount: 49,
  plan: 'Pro Plan · Monthly',
}

function statusVariant(status: Invoice['status']) {
  if (status === 'Paid')
    return 'bg-green-500/15 text-green-600 hover:bg-green-500/15'
  if (status === 'Pending')
    return 'bg-yellow-500/15 text-yellow-600 hover:bg-yellow-500/15'
  return 'bg-red-500/15 text-red-600 hover:bg-red-500/15'
}

function RouteComponent() {
  const [isSaving, setIsSaving] = useState(false)

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
    <ProjectPageLayout>
      <div className="mx-auto w-full space-y-8">
        <ProjectPageHeader
          eyebrow="Project billing"
          title="Billing & invoices."
          description="Manage payment methods, billing address, and invoices."
          actions={
            <Badge variant="outline" className="w-fit">
              Pro plan · Active
            </Badge>
          }
        />

        {/* Upcoming Invoice */}
        <ProjectPanel>
          <CardHeader className="border-b px-5 py-5">
            <CardTitle>Upcoming invoice</CardTitle>
            <CardDescription>Your next subscription payment.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
            <div className="flex items-center gap-3">
              <div className="bg-muted flex size-10 items-center justify-center rounded-xl">
                <Receipt className="text-muted-foreground size-5" />
              </div>

              <div>
                <p className="text-sm font-medium">Next payment</p>
                <p className="text-muted-foreground text-sm">
                  {upcomingInvoice.plan} — due {upcomingInvoice.date}
                </p>
              </div>
            </div>

            <div className="text-2xl font-semibold tracking-tight">
              ${upcomingInvoice.amount.toFixed(2)}
            </div>
          </CardContent>
        </ProjectPanel>

        {/* Payment Methods */}
        <ProjectPanel>
          <CardHeader className="flex flex-col gap-4 border-b px-5 py-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Payment Methods</CardTitle>
              <CardDescription>
                Manage the cards used for your subscription.
              </CardDescription>
            </div>

            <Dialog>
              <DialogTrigger
                render={
                  <Button className="self-start">
                    <Plus />
                    Add Card
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

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="card-number">Card Number</Label>
                    <Input id="card-number" placeholder="1234 5678 9012 3456" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="card-expiry">Expiry</Label>
                      <Input id="card-expiry" placeholder="MM/YY" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="card-cvc">CVC</Label>
                      <Input id="card-cvc" placeholder="123" />
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button type="submit">Save Card</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>

          <CardContent className="space-y-3 p-5">
            {paymentMethods.map((method) => (
              <div
                key={method.id}
                className="flex items-center justify-between rounded-xl border p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-muted flex size-10 items-center justify-center rounded-xl">
                    <CreditCard className="text-muted-foreground size-5" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium">
                      {method.brand} •••• {method.last4}
                      {method.default && (
                        <Badge variant="outline">Default</Badge>
                      )}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      Expires {method.expiry}
                    </div>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    }
                  />

                  <DropdownMenuContent align="end">
                    {!method.default && (
                      <DropdownMenuItem>Set as Default</DropdownMenuItem>
                    )}
                    <DropdownMenuItem className="text-destructive">
                      Remove Card
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </CardContent>
        </ProjectPanel>

        {/* Billing Address */}
        <ProjectPanel>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              e.stopPropagation()
              addressForm.handleSubmit()
            }}
          >
            <CardHeader className="border-b px-5 py-5">
              <CardTitle>Billing Address</CardTitle>
              <CardDescription>
                Used on your invoices and for tax calculation.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5 p-5">
              <addressForm.Field name="companyName">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Company Name</Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
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
                      onChange={(e) => field.handleChange(e.target.value)}
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
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
                      <FieldError errors={field.state.meta.errors} />
                    </div>
                  )}
                </addressForm.Field>

                <addressForm.Field name="postalCode">
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor={field.name}>Postal Code</Label>
                      <Input
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
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
                        onChange={(e) => field.handleChange(e.target.value)}
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
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Save Address
                  </Button>
                )}
              </addressForm.Subscribe>
            </CardFooter>
          </form>
        </ProjectPanel>

        {/* Invoice History */}
        <ProjectPanel>
          <CardHeader className="border-b px-5 py-5">
            <CardTitle>Invoice History</CardTitle>
            <CardDescription>
              All past invoices for this workspace.
            </CardDescription>
          </CardHeader>

          <CardContent className="overflow-x-auto p-0">
            <Table className="min-w-[640px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">Invoice</TableHead>
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
                    <TableCell className="pl-5 font-mono text-sm">
                      {invoice.id}
                    </TableCell>
                    <TableCell>{invoice.date}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {invoice.description}
                    </TableCell>
                    <TableCell>${invoice.amount.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge className={statusVariant(invoice.status)}>
                        {invoice.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon">
                        <Download className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </ProjectPanel>
      </div>
    </ProjectPageLayout>
  )
}
