type PasswordStrengthProps = {
  password: string
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  if (!password) return null

  const checks = [
    password.length >= 8,
    password.length >= 12,
    /[a-z]/.test(password) && /[A-Z]/.test(password),
    /\d/.test(password),
    /[^a-zA-Z0-9]/.test(password),
  ]

  const score = checks.filter(Boolean).length

  const levels = [
    { label: 'Very weak', color: 'bg-destructive' },
    { label: 'Weak', color: 'bg-orange-500' },
    { label: 'Fair', color: 'bg-amber-500' },
    { label: 'Good', color: 'bg-lime-500' },
    { label: 'Strong', color: 'bg-emerald-500' },
  ]

  const level = levels[Math.max(0, score - 1)]

  return (
    <div className="space-y-2 pt-1">
      <div
        className="flex gap-1"
        role="meter"
        aria-label="Password strength"
        aria-valuemin={0}
        aria-valuemax={5}
        aria-valuenow={score}
        aria-valuetext={level.label}
      >
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className={`h-1 flex-1 transition-colors duration-300 ${
              index < score ? level.color : 'bg-muted'
            }`}
          />
        ))}
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="text-muted-foreground text-xs">
          Use 12+ characters, mixed case, numbers and symbols.
        </p>
        <span className="text-muted-foreground shrink-0 text-xs font-medium">
          {level.label}
        </span>
      </div>
    </div>
  )
}
