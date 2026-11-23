# Contact support API

Both endpoints require the dashboard's `x-api-key` and `Authorization: Bearer <token>`.
The user must belong to the workspace; a project, if supplied, must belong to it.
Identity comes from the session, never a caller-supplied user ID or email.

## Submit without attachments

`POST /api/support/requests` with JSON:

```json
{
  "workspace_id": "11111111-1111-4111-8111-111111111111",
  "project_id": null,
  "issue_id": "heatmaps",
  "severity": "normal",
  "subject": "Heatmap does not load",
  "service": ["Analytics"],
  "message": "The heatmap shows an error when opened."
}
```

`201`: `{"success":true,"data":{"id":"<uuid>","createdAt":"<ISO date>"}}`.
No S3 calls or S3 configuration are required without attachments.
Requests are persisted, not emailed. Existing feedback submissions are separate.

## Optional attachments

1. `POST /api/support/attachments` with the same `workspace_id` / nullable
   `project_id` and `files: [{ "name": "error.png", "content_type": "image/png", "size": 1234 }]`.
2. For each item in `data`, POST browser `FormData` to its `url`, appending every
   returned `fields` entry unchanged, then the binary `file` **last**.
   Do not send API authorization headers to S3 or set multipart Content-Type manually.
3. Submit the request JSON with `attachment_ids: ["<returned upload id>"]`.

Upload grants expire in 10 minutes. Each is bound to one user, workspace, project,
filename, MIME type and exact byte count. Submission verifies objects in S3 and
copies them to a server-only final prefix so an upload grant cannot overwrite a
submitted attachment. IDs are single-use. Limits: five files, 10 MiB each, 25 MiB
total. Allowed filename/MIME pairs and enums live in `packages/contracts/src/support.ts`.
MIME/extension checks are not malware scanning; do not render uploads inline.

Errors use `{"success":false,"message":"..."}`: `400` invalid fields or attachments,
`401` missing/invalid session, `403` inaccessible workspace/project, `409` expired,
missing or already-used attachment, `503` upload storage unavailable; unexpected
server errors return `500` without internal exception details.

## Setup

- Run `pnpm --filter @pathlens/api migrate` after reviewing the generated migration.
- Use the existing `S3_BUCKET` (private bucket) and `AWS_REGION`; use standard AWS credentials/IAM.
- Allow the API role `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject` only on
  `support/pending/*` and `support/requests/*` in this bucket.
- Keep S3 Block Public Access enabled. Add bucket CORS allowing `POST` from your
  dashboard origins, e.g. `http://localhost:5173`, with allowed headers `*`.
- Add a lifecycle expiration rule scoped **only** to `support/pending/`, expiring
  objects after one day (also expire noncurrent versions if bucket versioning is on).
  This removes abandoned uploads and staging copies; never apply that rule to
  `support/requests/`. Merge with existing rules rather than replacing them.
- Expired unused upload metadata can be periodically removed from PostgreSQL.
  An interrupted process/failed transaction can leave an unreferenced final copy;
  reconciliation should delete final objects only after checking their request ID
  does not exist in PostgreSQL. Do not apply a blanket final-prefix expiration.

No bucket configuration, migration, or AWS deployment is performed automatically.
