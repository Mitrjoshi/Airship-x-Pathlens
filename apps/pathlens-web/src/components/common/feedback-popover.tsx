import type { CreateFeedbackPayload } from '@workspace/contracts'
import { useState, type FormEvent } from 'react'

import { useCreateFeedback } from '@/mutations/feedback'
import { getFeedbackStatusOptions } from '@/queries/feedback'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@workspace/ui/components/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@workspace/ui/components/popover'
import { Textarea } from '@workspace/ui/components/textarea'
import { Field, FieldError } from '@workspace/ui/components/field'
import { LoadingSwap } from '@workspace/ui/components/loading-swap'

const MAX_MESSAGE_LENGTH = 2000

export const FeedbackPopover = () => {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const createFeedback = useCreateFeedback()
  const { data: feedbackStatus, isLoading } = useQuery(
    getFeedbackStatusOptions()
  )
  const hasSubmitted = submitted || feedbackStatus?.data.submitted === true

  const resetForm = () => {
    setMessage('')
    setValidationError(null)
    setSubmitted(false)
    createFeedback.reset()
  }

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)

    if (!nextOpen) resetForm()
  }

  const submitFeedback = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const trimmedMessage = message.trim()

    if (trimmedMessage.length < 10) {
      setValidationError('Please share at least 10 characters.')
      return
    }

    const payload: CreateFeedbackPayload = {
      message: trimmedMessage,
      page_url: window.location.href,
    }

    createFeedback.mutate(payload, {
      onSuccess: () => {
        setMessage('')
        setValidationError(null)
        setSubmitted(true)
      },
    })
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        disabled={isLoading}
        render={<Button variant="outline">Feedback</Button>}
      />

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-full max-w-87.5 p-0"
      >
        {hasSubmitted ? (
          <div className="space-y-3 p-3">
            <p className="text-sm font-medium">Thank you for your feedback!</p>
            <p className="text-muted-foreground leading-1">
              We've received your note and will look into it. Having trouble?
              See
              <Button
                className={
                  'text-muted-foreground p-0 pl-1 underline underline-offset-4'
                }
                variant={'link'}
              >
                common issues
              </Button>
            </p>
          </div>
        ) : (
          <form className="space-y-3 p-3" onSubmit={submitFeedback}>
            <Field>
              <Textarea
                id="feedback-message"
                className="max-h-50 min-h-20"
                value={message}
                maxLength={MAX_MESSAGE_LENGTH}
                autoFocus
                rows={5}
                placeholder="Type your feedback here..."
                aria-invalid={Boolean(validationError)}
                onChange={(event) => {
                  setMessage(event.target.value)
                  setValidationError(null)
                }}
              />

              {validationError && (
                <FieldError
                  errors={[
                    {
                      message: validationError,
                    },
                  ]}
                />
              )}
            </Field>

            <div className="flex items-start gap-2">
              <p className="text-muted-foreground text-xs">
                We don't respond to submissions, but we read all of them
                carefully
              </p>
              <Button type="submit" disabled={createFeedback.isPending}>
                <LoadingSwap isLoading={createFeedback.isPending}>
                  Submit
                </LoadingSwap>
              </Button>
            </div>
          </form>
        )}
      </PopoverContent>
    </Popover>
  )
}
