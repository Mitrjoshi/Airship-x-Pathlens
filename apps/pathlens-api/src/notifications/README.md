# Scheduled Slack notifications

The notification dispatcher runs every minute when its SAM schedule is enabled.
It stores delivery rows in PostgreSQL before enqueueing delivery IDs to SQS.
The current implementation intentionally keeps the schedule disabled in
`template.yaml` until migration, integration credentials, and weekday inventory
review are complete.

## Scheduling policy

- Daily reports cover the previous completed local calendar day.
- Weekly reports cover the previous completed ISO Monday–Sunday week.
- A 15-minute grace period follows the reporting-period boundary.
- The dispatcher considers at most two daily periods and two weekly periods.
- The latest durable `scheduled_for` row per integration/report type is used as
  the catch-up cursor, so a normal minute run does not create old reports.
- A nonexistent DST delivery hour is skipped; a repeated hour is protected by
  the delivery uniqueness constraint.

Weekly schedules require `settings.weeklyDayConfirmed = true`. Authenticated
Slack settings saves establish that marker. Historical settings without the
marker are reported by `inventory:slack-weekdays` and are not scheduled.

Delivery processing is at-least-once. The database prevents duplicate delivery
records, but Slack can receive a duplicate if it accepts a message immediately
before a worker crashes or loses its lease.
