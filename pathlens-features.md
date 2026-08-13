# Pathlens Features

Pathlens is a privacy-conscious product analytics platform for understanding
how people discover, navigate, and convert on a website. It combines traffic
measurement, behavioral analysis, session replay, performance monitoring, and
team collaboration in a workspace-based product.

## Product Overview

Pathlens helps teams move from broad traffic questions to specific user
experiences:

- Understand how many people visit a website and how often they return.
- See which pages, sources, devices, browsers, and countries contribute to
  traffic.
- Follow the path visitors take through important journeys.
- Watch real sessions to understand what happened before a conversion,
  abandonment, or error.
- Identify where visitors click and how far they scroll.
- Monitor page-loading behavior across pages, browsers, and devices.
- Define measurable goals and funnels for the outcomes that matter to a
  business.
- Give each teammate the appropriate level of access to each workspace.

The product is organized around workspaces, projects, and websites. A
workspace is the team area, a project represents a website or product being
measured, and the project contains the analytics and optimization views for
that site.

## Website Measurement

### Easy Website Connection

Each project provides the information needed to connect a website to Pathlens.
Teams can view the website connection instructions and copy the project
tracking key from the project setup area. This gives a team a short path from
creating a project to receiving its first visitor signals.

Project setup includes:

- Project name.
- Website address.
- Optional project description.
- Project activity status.
- Website connection details.
- Public tracking key.

### Privacy-Conscious Collection

Pathlens is designed to provide behavioral context without requiring teams to
identify individual visitors by name. Visitors are represented through
anonymous identifiers, while the product retains useful context such as
device, browser, location, session, and page activity.

The tracking experience supports privacy-conscious controls for sensitive
content. Form passwords are excluded from input collection, and replay
recordings support masking inputs, text, and blocked page elements.

### Visitor and Session Context

Pathlens groups activity into anonymous visitors and sessions so that teams can
interpret isolated actions in context. A visitor can be viewed across multiple
sessions, while a session provides a time-bounded view of one visit.

Collected context can include:

- Page address, page path, page title, and referrer.
- Visitor, session, and project association.
- Device category and screen or viewport dimensions.
- Browser and browser version.
- Operating system and operating-system version.
- Country or regional information.
- Language and timezone.
- Session start, session end, and duration.

## Dashboard

The project dashboard is the primary summary of website activity. It gives a
team an immediate view of what is happening now, how performance compares with
the previous period, and which areas deserve further investigation.

### Dashboard Metrics

- Visitors.
- Sessions.
- Events.
- Page views.
- Average session duration.
- Conversion rate.
- Active visitors.
- New versus returning visitors.

Metric cards show period-over-period movement where applicable, making it easy
to recognize growth, decline, and sudden changes without manually comparing
separate reports.

### Dashboard Analysis

The dashboard includes:

- Visitor trend over time.
- Top pages and average time spent on each page.
- Traffic sources and their relative contribution.
- Device mix across desktop, mobile, and tablet visitors.
- New and returning visitor comparison.
- Most-triggered events.
- Average session duration and its change over time.
- Conversion rate and its change over time.
- Active visitor activity.
- Automated observations about notable sources, pages, devices, or bounce
  behavior.

### Dashboard Filters

Teams can view activity across:

- The last 24 hours.
- The last 7 days.
- The last 30 days.
- The last 90 days.
- All devices.
- Desktop.
- Mobile.
- Tablet.

## Analytics

The Analytics area provides a deeper view of audience quality and traffic
composition than the high-level dashboard.

### Audience Metrics

- Total visitors.
- Total sessions.
- Bounce rate.
- Average session duration.
- Daily visitor trend.
- Daily session trend.

### Audience Breakdowns

Teams can compare activity by:

- Device category.
- Referring source.
- Country.
- Browser.

These breakdowns help answer questions such as whether mobile visitors behave
differently from desktop visitors, which sources bring engaged audiences, and
whether a traffic change is concentrated in a particular geography or browser.

Analytics can be narrowed by date range and device type.

## Visitor Exploration

The Visitors area turns aggregate traffic into an actionable list of anonymous
visitor activity.

### Visitor Summary

- Total visitors.
- New visitors.
- Returning visitors.
- Average session duration.
- Visitors currently active.

### Visitor Directory

Each visitor record can show:

- Anonymous visitor reference.
- Country or location.
- Device.
- Browser.
- Number of sessions.
- Number of page views.
- Total duration.
- Current activity or last-seen time.

### Visitor Filters and Navigation

Teams can:

- Search visitors.
- View all visitors.
- View visitors active now.
- View visitors who are no longer active.
- Filter by date range.
- Move through multiple pages of results.
- Clear search and filters.

The active visitor view is useful for observing current traffic during a
campaign, launch, product release, or troubleshooting session.

## Event Activity

The Events area provides a chronological record of meaningful visitor actions
and technical signals. It connects an event to the page, session, visitor, and
device context needed to understand what occurred.

### Captured Activity

Pathlens can surface:

- Page views and navigation changes.
- Clicks and button interactions.
- Form submissions.
- Form success or error signals when available.
- Scroll activity.
- Mouse movement activity.
- Viewport resizing.
- JavaScript errors.
- Unhandled promise failures.
- Browser performance measurements.
- Session start and session end.
- Custom events.

### Event Summary

- Captured events.
- Sessions represented in the activity feed.
- Visitors represented in the activity feed.
- High-signal actions.

### Event Filters

The activity feed can be narrowed by:

- Search text.
- Page path.
- Date range.
- High-signal events.
- All events.
- Actions.
- Forms.
- Device type.

### Event Details

Opening an event reveals its surrounding context, including:

- Event type and description.
- Time of occurrence.
- Page path, title, page address, and referrer.
- Anonymous visitor and session identifiers.
- Country, device, browser, and operating system.
- Event-specific values.
- Whether a replay is available at that point in the session.

Click activity can include the clicked element, visible text, button text,
coordinates, element name, and appearance information. Form activity can
include the form name, destination, submission method, and outcome details.

When a replay is available, an event can open the session directly at the
moment the event occurred.

## Session Replay

Session Replay lets teams watch a reconstructed version of a visitor’s
experience rather than infer behavior from event rows alone. It is useful for
understanding confusion, friction, failed interactions, unexpected navigation,
and the sequence leading to conversion or abandonment.

### Replay Library

The replay list includes:

- Recorded session count.
- Sessions with playback available.
- Sessions still live.
- Average session duration.
- Storage usage.
- Anonymous visitor.
- Country.
- Device.
- Pages visited.
- Duration.
- Traffic source.
- Recording time.
- Replay availability.

Teams can search by visitor, page path, or source and filter by date range and
device. Sessions that do not contain a usable recording are clearly identified
as unavailable instead of appearing playable.

### Replay Player

The player supports:

- Reconstructed visitor screen.
- Play and pause.
- Previous and next event navigation.
- Timeline scrubbing.
- Elapsed and total duration.
- Event timeline.
- Click-to-seek event entries.
- Selected event details and event-specific values.
- Captured analytics-event count.
- Anonymous visitor and live-session indicators.
- Live connection status.
- A go-live action for an active session.

Replay can be opened from the session list or from an event, with event-based
opening positioned at the selected activity.

### Replay Privacy Controls

Replay recordings support privacy safeguards for sensitive website content:

- Input values can be masked.
- Text can be masked.
- Specific elements can be blocked from recording.
- Password input is not collected as ordinary input activity.

## Heatmaps

Heatmaps turn interaction data into a visual explanation of how visitors use a
page. Teams can identify high-attention areas, overlooked content, and scroll
depth before deciding what to redesign or test.

### Page Activity Selection

The page selector shows pages with captured activity and summarizes each page
with:

- Page views.
- Clicks.
- Scroll events.
- Maximum scroll depth.

Heatmap data can be filtered across the last 24 hours, 7 days, 30 days, or 90
days, and the view refreshes as new activity arrives.

### Click Heatmaps

The Clicks view provides:

- A reconstructed page preview.
- Visual click intensity over the page.
- Low-to-high activity legend.
- Grouped click regions.
- Ranked high-activity areas.
- Click coordinates.
- Click totals.
- Intensity bars for comparing regions.

This makes it easier to spot popular controls, dead areas, repeated clicks,
and interactions that may not be aligned with the intended page hierarchy.

### Scroll Heatmaps

The Scroll view provides:

- A reconstructed page preview.
- Scroll-depth intensity bands.
- A scale from the top of the page to the bottom.
- Average reached percentage.
- Visibility into where attention declines as visitors move down the page.

## Funnels

Funnels help teams measure a defined journey from entry to completion. They
make drop-off visible across the ordered steps of a workflow such as signup,
checkout, onboarding, or lead submission.

### Funnel Definition

A funnel includes:

- Name.
- Description.
- At least two ordered steps.
- A step name.
- A page-path target or event target for each step.

Teams can add, remove, reorder, edit, and save steps. Existing funnels can be
edited or permanently deleted with confirmation.

### Funnel Results

Each funnel reports:

- Visitors entering the funnel.
- Visitors completing the funnel.
- Overall conversion rate.
- Conversion trend against the comparable prior period.
- Visitors reaching each step.
- Drop-off between each step.
- The page or event target for every step.

Funnels follow visitors through the configured sequence within their sessions,
making the results useful for identifying the exact stage where a journey loses
momentum.

### Funnel Filters

Funnel performance can be viewed over a selected date range.

## Goals

Goals let teams turn product objectives into measurable targets. They provide a
clear progress view for outcomes such as generating revenue, completing forms,
reaching a page, or triggering an important event.

### Goal Types

Pathlens supports goals for:

- Events.
- Revenue.
- Page views.
- Button clicks.
- Form submissions.

### Goal Configuration

A goal can include:

- Name.
- Goal type.
- Numeric target.
- Unit of measurement.
- Matching target.
- Optional page path.
- Optional deadline.

Matching rules can be tailored to the goal type:

- Page-view goals can target an exact page path.
- Revenue goals can use revenue, value, or amount data associated with an
  event.
- Button goals can match button text and page path.
- Form goals can match a form name or reference.
- Event goals can match an event type or path.

### Goal Progress

Goal cards and tables show:

- Current value.
- Target value.
- Completion percentage.
- Trend.
- Status.
- Goal type.
- Match target.
- Deadline where provided.

Goals can be filtered by date range and status:

- All goals.
- On track.
- At risk.
- Achieved.

Teams can create, edit, and permanently delete goals with confirmation.

## Performance Monitoring

Performance monitoring helps teams see whether visitors are receiving a fast,
reliable page experience and where slowdowns are concentrated.

### Performance Metrics

Pathlens measures browser navigation timing signals including:

- DNS lookup time.
- TCP connection time.
- Time to first byte.
- DOM content loaded time.
- Full page-load time.

The performance view reports averages, 75th-percentile values for key timing
metrics, and total sample count.

### Performance Analysis

Teams can view:

- Performance trends over time.
- Per-page timing comparisons.
- Browser-level timing comparisons.
- Device-level timing comparisons.
- Sample counts for each comparison.

Performance can be filtered by date range and device type, allowing teams to
separate a site-wide issue from a mobile-only, browser-specific, or page-
specific problem.

## Reports and Export

Reports provide a concise, shareable view of traffic and audience performance.
They are useful for recurring reviews, campaign evaluation, and communicating
analytics findings to people who do not need the full product workspace.

### Report Contents

- Visitors.
- Sessions.
- Bounce rate.
- Average session duration.
- Daily traffic trend.
- Device mix.
- Top referrers.
- Top countries.
- Top browsers.
- The active date and device filters.

### CSV Export

Teams can export the current report as a CSV file. The export includes the
selected filters, summary metrics, daily traffic, device mix, referrers,
countries, and browsers.

Report export is controlled by workspace permissions so that teams can limit
who may take analytics data outside the product.

## Workspaces and Collaboration

Workspaces provide the organizational layer for teams managing one or more
websites.

### Workspace Management

Teams can:

- Create multiple workspaces.
- Switch between workspaces.
- Return to a workspace chooser.
- See the default workspace.
- See project and member counts.
- Rename a workspace.
- Review the current user’s role and access profile.
- Delete a workspace after confirming its exact name.

Deleting a workspace removes its associated projects, members, and collected
analytics data, so the confirmation step is intentionally explicit.

### Members and Invitations

Workspace administrators can:

- View active members.
- View pending invitations.
- Invite existing Pathlens users by email.
- Assign an access profile to an invitation.
- Change a member’s access profile.
- Remove non-owner members.

Invitees receive the invitation in the product notification area and gain
access after accepting it. The invitation flow is designed for people who
already have a Pathlens account.

The workspace owner is protected from ordinary member-management actions such
as removal or role reassignment.

### Permission Profiles

Permission profiles are reusable bundles of workspace access rules. A profile
can control access to:

- Workspace visibility and settings.
- Workspace rename and deletion.
- Member viewing, invitations, changes, and removal.
- Permission-profile management.
- Project viewing, creation, and deletion.
- Project settings and tracking-key visibility.
- Dashboard and analytics areas.
- Visitors, events, session replay, and performance.
- Funnels and goals.
- Reports and report export.
- AI insight visibility.

Teams can create custom profiles, edit them, duplicate existing profiles, and
select permissions individually or by group. Built-in profiles provide common
starting points such as full access and viewer access. Built-in profiles cannot
be edited or deleted, and profiles assigned to members or pending invitations
cannot be deleted.

Workspace owners have full access regardless of the assigned profile.

## Project Management

### Project Creation

A workspace can contain multiple projects. Creating a project requires:

- Project name.
- Website address.
- Optional short description.

The project list gives teams a quick overview of each website, including:

- Active or inactive status.
- Connected domain.
- Visitors.
- Sessions.
- Events.
- Conversion percentage.

### Project Navigation

Each project groups its product analytics tools into a dedicated workspace:

- Dashboard.
- Analytics.
- Heatmaps.
- Visitors.
- Performance.
- Session Replay.
- Events.
- Funnels.
- Goals.
- AI Insights.
- Reports.
- Tracking Keys.
- Settings.

Navigation is permission-aware, so teammates only see areas available to their
access profile.

### Project Settings

The project settings area organizes controls for:

- Project name and description.
- Project status.
- Session replay collection.
- Performance measurement.
- Error tracking.
- Allowed domains.
- Project connection details and tracking key.
- Project deletion.

Deleting a project also deletes its collected analytics data and requires an
explicit confirmation.

## Search, Notifications, and Feedback

### Global Search

Global search helps users move quickly across a growing Pathlens account. It
can find:

- Application pages.
- Workspace pages.
- Project pages.
- Workspaces.
- Projects.

Search supports text filtering, keyboard navigation, opening a selected result,
and closing with Escape. It can be opened from the search control or with
Control + K on Windows/Linux and Command + K on macOS.

### Notifications

The notification area currently centers on workspace collaboration. Users can
review invitations and see:

- Who sent the invitation.
- Which workspace is involved.
- Which access profile is assigned.
- An action to accept the invitation.

### Product Feedback

Users can send contextual feedback from inside a project. Feedback categories
include:

- Something is broken.
- Tracking or data quality is not right.
- A product idea.

Feedback includes the user’s message and the current page context, helping the
Pathlens team understand where the issue or suggestion originated. The form
requires a meaningful message and confirms successful submission.

## Account and Personal Preferences

The account area groups personal settings into profile, security, and
notification sections.

### Profile

The profile area presents:

- Profile image or avatar fallback.
- Name.
- Email address.
- Profile update controls.
- Account deletion information.

The account deletion guidance explains that workspaces owned by the user must
be transferred or deleted separately.

### Security

Security controls are organized around:

- Current password.
- New password.
- Password confirmation.
- Two-factor authentication.
- Active sessions.
- Current-device identification.
- Revoking other sessions.

### Notification Preferences

Personal notification preferences include options for:

- Weekly summary.
- Traffic spike alerts.
- Team activity.
- Product updates.

## Plans and Billing

Pathlens presents a plan and billing experience for understanding subscription
levels and account usage.

### Plan Comparison

The plans area compares Starter, Pro, and Business offerings across features
such as:

- Page-view capacity.
- Event capacity.
- Number of projects.
- Session replay.
- Data retention.
- Team-member capacity.
- Support level.
- Single sign-on and audit features.

It also provides monthly and yearly billing views and highlights yearly
pricing savings.

### Usage and Subscription Summary

The subscription summary presents:

- Current plan.
- Monthly price.
- Renewal date.
- Active status.
- Usage against page-view, event, project, and team-member limits.

### Workspace Billing

Workspace billing includes areas for:

- Upcoming invoice.
- Payment methods.
- Default payment method.
- Card expiration details.
- Billing address.
- Company name.
- Tax identifier.
- Invoice history.
- Invoice status and amount.
- Invoice download controls.

## AI Insights

The AI Insights area presents a focused place for interpreting changes in
project activity. Insight categories include:

- Trends.
- Anomalies.
- Opportunities.

Teams can filter insights by category and see summary counts for each type.
Insight cards include:

- Title.
- Explanation.
- Project context.
- Time of observation.
- Impact level.

Impact is grouped into high, medium, and low levels. Users can provide positive
or negative feedback on an insight to indicate whether it was useful.

## Navigation and Experience

Pathlens includes product-wide controls designed to keep investigation fast:

- Workspace switcher for moving between team areas.
- Project switcher for moving between websites.
- Collapsible project sidebar.
- Global search.
- Notifications.
- Contextual feedback.
- Light, dark, and system appearance modes.
- User menu with account access and logout.

The application keeps high-level summaries close to detailed evidence. A team
can start with a dashboard trend, inspect the relevant events, watch a session
at the moment of interest, and then use heatmaps, funnels, goals, or
performance comparisons to decide what to change.

## Typical Product Workflows

### From Setup to First Insight

1. Create an account.
2. Create or choose a workspace.
3. Create a project for a website.
4. Follow the project setup instructions.
5. Connect the website.
6. Confirm incoming visitor and session activity.
7. Review the dashboard for traffic, pages, devices, and sources.

### From Traffic Change to Root Cause

1. Notice a change in visitors, sessions, conversion, or performance.
2. Narrow the dashboard or analytics view by date and device.
3. Compare sources, pages, browsers, and countries.
4. Inspect the event feed for high-signal actions or errors.
5. Open an available replay at the relevant event.
6. Use heatmaps to check whether page interaction or scroll depth explains the
   behavior.

### From Business Question to Measurement

1. Define the journey or outcome the team cares about.
2. Build a funnel with the required ordered steps.
3. Create goals for important events, page views, forms, buttons, or revenue.
4. Set date ranges and review progress.
5. Use drop-off, goal status, and trend information to prioritize improvements.

### From Team Setup to Controlled Access

1. Create a workspace.
2. Define reusable permission profiles.
3. Invite existing Pathlens users.
4. Assign each person the appropriate profile.
5. Review pending invitations and acceptances.
6. Use permission-aware navigation and report export controls to protect
   sensitive work.
