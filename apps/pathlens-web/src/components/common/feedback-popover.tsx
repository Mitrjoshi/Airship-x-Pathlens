import type {
  CreateFeedbackPayload,
  FeedbackCategory,
} from '@workspace/contracts'
import { useState, type FormEvent } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Bug,
  CheckCircle2,
  Lightbulb,
  Loader2,
  MousePointer2,
  Send,
  type LucideIcon,
} from 'lucide-react'

import { useCreateFeedback } from '@/mutations/feedback'
import { Button } from '@workspace/ui/components/button'
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@workspace/ui/components/popover'
import { Textarea } from '@workspace/ui/components/textarea'

interface FeedbackOption {
  category: FeedbackCategory
  icon: LucideIcon
  title: string
  description: string
}

const feedbackOptions: FeedbackOption[] = [
  {
    category: 'bug',
    icon: Bug,
    title: "Something's broken",
    description: 'Report a bug or unexpected behavior',
  },
  {
    category: 'tracking',
    icon: MousePointer2,
    title: "Tracking isn't right",
    description: 'Tell us about inaccurate or missing data',
  },
  {
    category: 'idea',
    icon: Lightbulb,
    title: 'I have an idea',
    description: "Suggest something you'd love to see",
  },
]

const MAX_MESSAGE_LENGTH = 2000

export const FeedbackPopover = ({
  workspaceId,
  projectId,
}: {
  workspaceId: string
  projectId: string
}) => {
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState<FeedbackCategory | null>(null)
  const [message, setMessage] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const createFeedback = useCreateFeedback()
  const selectedOption = feedbackOptions.find(
    (option) => option.category === category
  )

  const resetForm = () => {
    setCategory(null)
    setMessage('')
    setValidationError(null)
    setSubmitted(false)
    createFeedback.reset()
  }

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)

    if (!nextOpen) resetForm()
  }

  const selectCategory = (nextCategory: FeedbackCategory) => {
    setCategory(nextCategory)
    setMessage('')
    setValidationError(null)
    createFeedback.reset()
  }

  const submitFeedback = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!category) return

    const trimmedMessage = message.trim()

    if (trimmedMessage.length < 10) {
      setValidationError('Please share at least 10 characters.')
      return
    }

    const payload: CreateFeedbackPayload = {
      category,
      message: trimmedMessage,
      page_url: window.location.href,
      workspace_id: workspaceId,
      project_id: projectId,
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
        render={
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            Feedback
          </Button>
        }
      />

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[calc(100vw-2rem)] max-w-[390px] p-0"
      >
        <div className="p-4 pb-3">
          <PopoverHeader className="flex-row items-start gap-2">
            {category && !submitted && (
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="-ml-2 shrink-0"
                aria-label="Choose a different feedback type"
                onClick={resetForm}
              >
                <ArrowLeft />
              </Button>
            )}

            <div className="min-w-0">
              <PopoverTitle className="text-sm font-semibold">
                {submitted
                  ? 'Thanks for your feedback'
                  : (selectedOption?.title ?? 'Share feedback')}
              </PopoverTitle>

              <p className="text-muted-foreground mt-1 text-xs">
                {submitted
                  ? 'Your feedback helps us make PathLens better.'
                  : (selectedOption?.description ??
                    'Help us make PathLens better.')}
              </p>
            </div>
          </PopoverHeader>
        </div>

        {submitted ? (
          <div className="flex flex-col items-center px-4 pb-5 text-center">
            <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-full">
              <CheckCircle2 className="size-5" />
            </div>
            <p className="mt-3 text-sm font-medium">We appreciate it.</p>
            <p className="text-muted-foreground mt-1 text-xs">
              The team will review your feedback.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={resetForm}
            >
              Send more feedback
            </Button>
          </div>
        ) : category ? (
          <form className="space-y-3 px-4 pb-4" onSubmit={submitFeedback}>
            <div className="space-y-2">
              <label htmlFor="feedback-message" className="text-sm font-medium">
                What would you like us to know?
              </label>
              <Textarea
                id="feedback-message"
                className="mt-2 max-h-50"
                value={message}
                maxLength={MAX_MESSAGE_LENGTH}
                autoFocus
                rows={5}
                placeholder="Tell us what happened or what you would like to see..."
                aria-invalid={Boolean(validationError)}
                onChange={(event) => {
                  setMessage(event.target.value)
                  setValidationError(null)
                }}
              />
              <div className="flex items-start justify-between gap-3 text-[11px]">
                <p className="text-destructive min-h-4">
                  {validationError ??
                    (createFeedback.isError
                      ? createFeedback.error.message
                      : '')}
                </p>
                <span className="text-muted-foreground shrink-0 tabular-nums">
                  {message.length}/{MAX_MESSAGE_LENGTH}
                </span>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={createFeedback.isPending}
            >
              {createFeedback.isPending ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Send />
              )}
              Send feedback
            </Button>
          </form>
        ) : (
          <div className="px-2 pb-2">
            {feedbackOptions.map((option) => {
              const Icon = option.icon

              return (
                <button
                  key={option.category}
                  type="button"
                  className="group hover:bg-muted/60 flex w-full items-center gap-3 rounded-md px-2.5 py-2.5 text-left transition-colors"
                  onClick={() => selectCategory(option.category)}
                >
                  <div className="bg-background flex size-8 shrink-0 items-center justify-center rounded-md border">
                    <Icon
                      className="text-muted-foreground group-hover:text-foreground size-4 transition-colors"
                      strokeWidth={1.8}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{option.title}</div>

                    <div className="text-muted-foreground mt-0.5 truncate text-[11px]">
                      {option.description}
                    </div>
                  </div>

                  <ArrowRight className="text-muted-foreground/40 group-hover:text-muted-foreground size-3.5 transition-all group-hover:translate-x-0.5" />
                </button>
              )
            })}
          </div>
        )}

        {!category && !submitted && (
          <div className="border-t px-4 py-2.5">
            <p className="text-muted-foreground text-[10px]">
              Your feedback helps shape PathLens.
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
