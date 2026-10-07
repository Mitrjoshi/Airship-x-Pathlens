# Pathlens Web UI Style

This document describes the UI language used by the Pathlens web application.
It is based on the current application shell, authenticated screens, shared UI
components, dashboard views, and global styles. The `src/-routes` folder is
intentionally excluded from this guide.

## Design Direction

Pathlens uses a focused analytics-product interface:

- Keep screens clean, quiet, and information-dense without feeling cramped.
- Use neutral surfaces and borders to establish hierarchy.
- Use the green brand color sparingly for primary actions, focus states, live
  indicators, and selected navigation.
- Prefer familiar shadcn-style controls from `@workspace/ui` over custom
  controls.
- Let data, labels, and clear spacing provide visual structure instead of
  decorative effects.

## Typography

- Use Geist Variable through the shared `font-sans` token.
- Use the default sans-serif font for all interface text.
- Use medium or semibold weight for page titles, navigation labels, and key
  values.
- Use muted text for supporting descriptions, timestamps, helper text, and
  secondary metadata.
- Use compact text sizes for dense metadata and controls, usually `text-xs` or
  `text-sm`.
- Use `font-mono` for technical values such as API keys, code, and identifiers.
- Keep headings concise. Workspace and account pages generally use a modest
  `text-2xl` heading, while authentication screens may use a larger welcome
  heading.

## Color

Use semantic color tokens rather than hardcoded colors wherever possible.

### Light Theme

- Background: white (`#ffffff`)
- Foreground: near-black (`#0a0a0a`)
- Card: white
- Muted and secondary surfaces: light gray (`#f5f5f5`)
- Muted foreground: medium gray (`#737373`)
- Border and input border: light gray (`#e5e5e5`)
- Sidebar: slightly off-white (`#fafafa`)

### Dark Theme

- Background: near-black (`#0b0b0b`)
- Card and sidebar: dark neutral surfaces
- Foreground: near-white
- Muted surfaces: dark gray
- Muted foreground: light gray
- Borders: subtle dark gray

### Brand and Status

- Primary brand: green `#41ce8f`
- Primary foreground: deep green `#052e1e`
- Destructive: red, using the `destructive` token
- Charts: use the semantic chart tokens such as `chart-1` through `chart-10`
- Do not use the brand green as a general background or for every interactive
  element. Reserve it for emphasis.

Prefer these semantic classes:

```tsx
<div className="bg-background text-foreground border-border" />
<p className="text-muted-foreground" />
<Button className="bg-primary text-primary-foreground" />
```

## Shape, Borders, and Elevation

- Use the shared radius scale. The base radius is approximately `0.625rem`.
- Use rounded corners for cards, controls, badges, popovers, and avatars.
- Keep borders visible but restrained; borders are a primary source of
  structure in both themes.
- Use cards for grouped content, settings sections, summaries, and charts.
- Avoid heavy shadows in the authenticated product. Use elevation mainly for
  popovers, dialogs, and floating surfaces.
- Dashed borders are appropriate for destructive card footers, separators, or
  special status treatments, but should not be the default border style.

## Layout and Spacing

- The authenticated app is organized around a collapsible sidebar and a
  compact top header.
- Keep the header sticky when it contains workspace, project, or page context.
- Use a centered content column for workspace and account settings, commonly
  with `max-w-4xl` and top padding around `pt-10`.
- Use consistent vertical rhythm, generally `space-y-4` or `space-y-5` between
  sections.
- Use `gap-2` for compact control groups, `gap-4` for normal horizontal
  groups, and larger gaps only to separate meaningful sections.
- Dashboard pages can use wider layouts for charts and analytics cards, while
  forms and settings should remain readable rather than stretching to the
  viewport.
- On narrow screens, allow controls to wrap or stack. Do not force dense
  desktop toolbars to remain on one line.

## Navigation

- Use the shared `Sidebar` components for primary authenticated navigation.
- Navigation items pair a Lucide icon with a short, recognizable label.
- The active item should be clearly distinguishable through the sidebar's
  semantic active/accent styles, not through a new one-off color.
- Workspace and project switching belong in the sidebar header or nearby
  contextual controls.
- Use `SidebarTrigger` and the collapsible icon mode for responsive behavior.
- Keep the top header focused on context and lightweight actions; do not repeat
  the entire sidebar navigation there.

## Controls and Forms

- Use components from `@workspace/ui/components/*` for buttons, inputs, fields,
  selects, dialogs, popovers, badges, and separators.
- Use primary buttons for the main action of a section and outline or ghost
  buttons for secondary actions.
- Use link buttons for navigation that should visually read as a link.
- Group labels, controls, and validation messages with the shared `Field`
  components.
- Keep form spacing generous enough to scan, usually `gap-4` or `gap-5`.
- Show validation errors next to the relevant field and preserve the input
  layout when errors appear.
- Use loading swaps, disabled controls, and clear progress indicators during
  async operations.
- Use icon-only buttons only when the icon has an accessible label or tooltip.

## Data Visualization

- Use cards to contain charts and related summaries.
- Use semantic chart tokens instead of arbitrary colors.
- Keep chart legends and tooltips consistent with the shared chart components.
- Use different chart colors to distinguish categories, not to add decoration.
- Pair visual data with readable labels and explicit units.
- Put date ranges, refresh controls, and live mode controls in a compact toolbar
  above the data.
- Show the last-updated time when data can become stale.
- Use skeletons while data loads instead of shifting the final layout abruptly.

## Tables and Lists

- Use clear column labels and compact row spacing for operational data.
- Truncate long names, domains, and identifiers while preserving access to the
  full value through a title, detail view, or responsive treatment.
- Pair primary values with muted secondary metadata.
- Keep row actions predictable and aligned to the right where appropriate.
- Use avatars or initials for people and workspace members when available.

## Loading, Empty, and Error States

- Loading screens use a centered message, a restrained progress indicator, and
  the application background.
- Preserve the surrounding layout with skeleton components for local loading.
- Empty states should explain what is missing and provide a clear next action
  when one exists.
- Error states should use the destructive semantic color only for the error
  signal, not as a full-page background.
- Provide a direct recovery action such as retry, refresh, or navigation.

## Motion and Interaction

- Motion should clarify state changes, loading, and progressive disclosure.
- Keep transitions short and subtle for controls and navigation.
- Existing animated screens use opacity, small vertical movement, scale, and
  sliding progress effects rather than large transformations.
- Respect `prefers-reduced-motion: reduce`; disable decorative animation and
  keep functional feedback understandable without motion.
- Use hover and focus states that strengthen contrast without changing layout.

## Icons and Imagery

- Use Lucide icons consistently with the existing navigation and control
  patterns.
- Match icon size to the control, usually around `size-4` for compact UI.
- Icons should support the label, not replace a necessary label.
- Avoid adding decorative illustrations to dense product screens unless they
  communicate product state or context.

## Responsive Behavior

- Design for desktop analytics workflows first, but ensure every screen works
  on narrow widths.
- Collapse or hide the sidebar appropriately and expose the sidebar trigger.
- Stack toolbar actions and form columns when horizontal space is limited.
- Keep touch targets usable and avoid relying on hover-only information.
- Use responsive padding and max-widths rather than fixed viewport-specific
  widths.

## Implementation Rules

- Import shared primitives from `@workspace/ui/components/*`.
- Use Tailwind semantic tokens and existing utility patterns before adding new
  CSS.
- Add a new global style only when the behavior cannot be expressed with the
  existing design tokens or utilities.
- Follow the app's single-quote, no-semicolon formatting convention.
- Keep page-specific visual treatments local to the page unless they are
  clearly reusable.
- Check both light and dark themes when changing colors, borders, charts, or
  focus states.
- Verify loading, error, empty, keyboard, and reduced-motion states alongside
  the successful data state.

## Quick Review Checklist

- Does the screen use semantic colors and shared UI primitives?
- Is the primary action visually obvious without overpowering the page?
- Are muted text and borders still readable in both themes?
- Does the layout remain usable at narrow widths?
- Are loading, empty, and error states accounted for?
- Are icons labeled when they are used without visible text?
- Is motion useful and disabled for reduced-motion users?
- Does the result feel like a calm, data-focused Pathlens screen rather than a
  separate visual system?
