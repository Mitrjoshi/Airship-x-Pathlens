import {
  bigint,
  boolean,
  check,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { IntegrationStatus, Permission } from "@workspace/contracts";
import type { ReplayEvent } from "@workspace/contracts";

/* -------------------------------------------------------------------------- */
/*                                    USERS                                   */
/* -------------------------------------------------------------------------- */

export const avatars = pgTable("avatars", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  category: text("category").notNull(),
  storageKey: text("storage_key").notNull().unique(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const integrations = pgTable(
  "integrations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    content: text("content").notNull().default(""),
    assets: jsonb("assets")
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    support: text("support"),
    documentation: text("documentation"),
    terms: text("terms"),
    privacy: text("privacy"),
    website: text("website"),
    category: text("category").notNull(),
    iconUrl: text("icon_url"),
    status: text("status")
      .$type<IntegrationStatus>()
      .notNull()
      .default("available"),
    sortOrder: integer("sort_order").notNull().default(0),
    isVisible: boolean("is_visible").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    statusCheck: check(
      "integrations_status_check",
      sql`${table.status} IN ('available', 'coming_soon', 'disabled')`
    ),
    visibleSortIdx: index("integrations_visible_sort_idx").on(
      table.isVisible,
      table.sortOrder,
      table.name
    ),
  })
);
export const projectIntegrations = pgTable(
  "project_integrations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    integrationId: uuid("integration_id")
      .notNull()
      .references(() => integrations.id, { onDelete: "cascade" }),
    providerWorkspaceId: text("provider_workspace_id").notNull(),
    providerWorkspaceName: text("provider_workspace_name").notNull(),
    encryptedCredentials: text("encrypted_credentials").notNull(),
    credentialKeyVersion: integer("credential_key_version")
      .notNull()
      .default(1),
    providerBotUserId: text("provider_bot_user_id"),
    grantedScopes: text("granted_scopes")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    settings: jsonb("settings")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    notificationPreferences: jsonb("notification_preferences")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    status: text("status").notNull().default("connected"),
    connectedByUserId: uuid("connected_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    connectedAt: timestamp("connected_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    lastError: text("last_error"),
  },
  (table) => ({
    projectIntegrationUnique: uniqueIndex(
      "project_integrations_project_integration_idx"
    ).on(table.projectId, table.integrationId),
    projectIdx: index("project_integrations_project_idx").on(table.projectId),
    statusCheck: check(
      "project_integrations_status_check",
      sql`${table.status} IN ('connected', 'disconnected', 'error')`
    ),
  })
);

export const integrationNotificationDeliveries = pgTable(
  "integration_notification_deliveries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    projectIntegrationId: uuid("project_integration_id")
      .notNull()
      .references(() => projectIntegrations.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    reportType: text("report_type").notNull(),
    reportingPeriodStart: timestamp("reporting_period_start", {
      withTimezone: true,
    }).notNull(),
    reportingPeriodEnd: timestamp("reporting_period_end", {
      withTimezone: true,
    }).notNull(),
    reportingTimezone: text("reporting_timezone").notNull(),
    channelId: text("channel_id").notNull(),
    scheduledFor: timestamp("scheduled_for", {
      withTimezone: true,
    }).notNull(),
    readyAt: timestamp("ready_at", { withTimezone: true }).notNull(),
    status: text("status").notNull().default("scheduled"),
    attempts: integer("attempts").notNull().default(0),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    lockToken: uuid("lock_token"),
    providerMessageId: text("provider_message_id"),
    lastErrorCode: text("last_error_code"),
    lastError: text("last_error"),
    lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
    enqueuedAt: timestamp("enqueued_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    deliveryUnique: uniqueIndex(
      "integration_notification_deliveries_unique_idx"
    ).on(
      table.provider,
      table.projectIntegrationId,
      table.reportType,
      table.reportingPeriodStart,
      table.reportingPeriodEnd
    ),
    dueIdx: index("integration_notification_deliveries_due_idx").on(
      table.status,
      table.readyAt,
      table.nextAttemptAt,
      table.enqueuedAt
    ),
    leaseIdx: index("integration_notification_deliveries_lease_idx").on(
      table.status,
      table.lockedUntil
    ),
    integrationIdx: index(
      "integration_notification_deliveries_integration_idx"
    ).on(table.projectIntegrationId, table.reportType),
    statusCheck: check(
      "integration_notification_deliveries_status_check",
      sql`${table.status} IN ('scheduled', 'queued', 'processing', 'succeeded', 'retryable_failed', 'permanent_failed', 'cancelled')`
    ),
    reportTypeCheck: check(
      "integration_notification_deliveries_report_type_check",
      sql`${table.reportType} IN ('daily', 'weekly')`
    ),
    providerCheck: check(
      "integration_notification_deliveries_provider_check",
      sql`${table.provider} = 'slack'`
    ),
  })
);

export const slackOauthStates = pgTable(
  "slack_oauth_states",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    nonceHash: text("nonce_hash").notNull().unique(),
    returnPath: text("return_path").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    expiryIdx: index("slack_oauth_states_expiry_idx").on(table.expiresAt),
    workspaceIdx: index("slack_oauth_states_workspace_idx").on(
      table.workspaceId
    ),
    projectIdx: index("slack_oauth_states_project_idx").on(table.projectId),
  })
);

export const stripeOauthStates = pgTable(
  "stripe_oauth_states",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    nonceHash: text("nonce_hash").notNull().unique(),
    returnPath: text("return_path").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    expiryIdx: index("stripe_oauth_states_expiry_idx").on(table.expiresAt),
    workspaceIdx: index("stripe_oauth_states_workspace_idx").on(
      table.workspaceId
    ),
    projectIdx: index("stripe_oauth_states_project_idx").on(table.projectId),
  })
);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),

  name: text("name").notNull(),
  password: text("password"),

  email: text("email").notNull().unique(),

  avatar: text("avatar"),
  avatarId: uuid("avatar_id").references(() => avatars.id, {
    onDelete: "set null",
  }),
  githubId: text("github_id").unique(),
  githubAvatar: text("github_avatar"),
  googleId: text("google_id").unique(),
  googleAvatar: text("google_avatar"),

  lifetimeAccess: boolean("lifetime_access").notNull().default(false),

  stripeCustomerId: text("stripe_customer_id"),

  stripePaymentId: text("stripe_payment_id"),

  createdAt: timestamp("created_at", {
    withTimezone: true,
  }).defaultNow(),
});

/* -------------------------------------------------------------------------- */
/*                          PASSWORD RESET TOKENS                            */
/* -------------------------------------------------------------------------- */

export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),

    tokenHash: text("token_hash").notNull().unique(),

    expiresAt: timestamp("expires_at", {
      withTimezone: true,
    }).notNull(),

    usedAt: timestamp("used_at", {
      withTimezone: true,
    }),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdx: index("password_reset_tokens_user_idx").on(table.userId),
    expiryIdx: index("password_reset_tokens_expiry_idx").on(table.expiresAt),
  })
);

/* -------------------------------------------------------------------------- */
/*                                 WORKSPACES                                 */
/* -------------------------------------------------------------------------- */

export const workspaces = pgTable(
  "workspaces",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),

    name: text("name").notNull(),

    /**
     * Every user has one default workspace.
     * Team workspaces will have isDefault = false.
     */
    isDefault: boolean("is_default").notNull().default(false),

    usageStatus: text("usage_status").notNull().default("active"),

    usageWarningAt: timestamp("usage_warning_at", {
      withTimezone: true,
    }),

    usagePausedAt: timestamp("usage_paused_at", {
      withTimezone: true,
    }),

    // Retained for migration compatibility; billing access is account-scoped.
    unlimitedUsage: boolean("unlimited_usage").notNull().default(false),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    }).defaultNow(),
  },
  (table) => ({
    userIdx: index("workspaces_user_idx").on(table.userId),
  })
);

/* -------------------------------------------------------------------------- */
/*                              WORKSPACE MEMBERS                             */
/* -------------------------------------------------------------------------- */

export const permissionProfiles = pgTable(
  "permission_profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, {
        onDelete: "cascade",
      }),

    name: text("name").notNull(),

    description: text("description"),

    permissions: jsonb("permissions").$type<Permission[]>().notNull(),

    isSystem: boolean("is_system").notNull().default(false),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    workspaceIdx: index("permission_profiles_workspace_idx").on(
      table.workspaceId
    ),
    workspaceNameIdx: uniqueIndex("permission_profiles_workspace_name_idx").on(
      table.workspaceId,
      table.name
    ),
  })
);

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, {
        onDelete: "cascade",
      }),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),

    role: text("role").notNull().default("member"),

    permissionProfileId: uuid("permission_profile_id").references(
      () => permissionProfiles.id,
      {
        onDelete: "set null",
      }
    ),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    }).defaultNow(),
  },
  (table) => ({
    primaryKey: primaryKey({
      columns: [table.workspaceId, table.userId],
      name: "workspace_members_pk",
    }),
    workspaceIdx: index("workspace_members_workspace_idx").on(
      table.workspaceId
    ),
    userIdx: index("workspace_members_user_idx").on(table.userId),
  })
);

/* -------------------------------------------------------------------------- */
/*                                AUDIT LOGS                                  */
/* -------------------------------------------------------------------------- */

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, {
        onDelete: "cascade",
      }),

    actorUserId: uuid("actor_user_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),

    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),

    action: text("action").notNull(),
    resourceType: text("resource_type").notNull(),
    resourceId: text("resource_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    workspaceCreatedIdx: index("audit_logs_workspace_created_idx").on(
      table.workspaceId,
      table.createdAt
    ),
    workspaceProjectCreatedIdx: index(
      "audit_logs_workspace_project_created_idx"
    ).on(table.workspaceId, table.projectId, table.createdAt),
    actorIdx: index("audit_logs_actor_idx").on(table.actorUserId),
    actionIdx: index("audit_logs_action_idx").on(table.action),
  })
);

/* -------------------------------------------------------------------------- */
/*                            REPORT GENERATIONS                              */
/* -------------------------------------------------------------------------- */

export const reportGenerations = pgTable(
  "report_generations",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, {
        onDelete: "cascade",
      }),

    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "cascade",
    }),

    actorUserId: uuid("actor_user_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),

    reportType: text("report_type").notNull(),
    filters: jsonb("filters").$type<Record<string, unknown>>().notNull(),
    status: text("status").notNull().default("generating"),
    storagePath: text("storage_path"),
    fileName: text("file_name"),
    mimeType: text("mime_type"),
    fileSize: integer("file_size"),
    error: text("error"),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    completedAt: timestamp("completed_at", {
      withTimezone: true,
    }),
  },
  (table) => ({
    workspaceCreatedIdx: index("report_generations_workspace_created_idx").on(
      table.workspaceId,
      table.createdAt
    ),
    workspaceProjectCreatedIdx: index(
      "report_generations_workspace_project_created_idx"
    ).on(table.workspaceId, table.projectId, table.createdAt),
    statusIdx: index("report_generations_status_idx").on(table.status),
  })
);

/* -------------------------------------------------------------------------- */
/*                               NOTIFICATIONS                                */
/* -------------------------------------------------------------------------- */

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    recipientUserId: uuid("recipient_user_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),

    senderUserId: uuid("sender_user_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),

    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, {
        onDelete: "cascade",
      }),

    type: text("type").notNull().default("workspace_invite"),

    role: text("role").notNull().default("member"),

    permissionProfileId: uuid("permission_profile_id").references(
      () => permissionProfiles.id,
      {
        onDelete: "set null",
      }
    ),

    readAt: timestamp("read_at", {
      withTimezone: true,
    }),

    acceptedAt: timestamp("accepted_at", {
      withTimezone: true,
    }),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    }).defaultNow(),
  },
  (table) => ({
    recipientIdx: index("notifications_recipient_idx").on(
      table.recipientUserId
    ),
    workspaceIdx: index("notifications_workspace_idx").on(table.workspaceId),
    pendingWorkspaceInviteIdx: uniqueIndex(
      "notifications_pending_workspace_invite_idx"
    )
      .on(table.workspaceId, table.recipientUserId)
      .where(
        sql`${table.type} = 'workspace_invite' AND ${table.acceptedAt} IS NULL`
      ),
  })
);

/* -------------------------------------------------------------------------- */
/*                                  PROJECTS                                  */
/* -------------------------------------------------------------------------- */

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, {
        onDelete: "cascade",
      }),

    name: text("name").notNull(),

    description: text("description"),

    faviconUrl: text("favicon_url"),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    }).defaultNow(),
  },
  (table) => ({
    workspaceIdx: index("projects_workspace_idx").on(table.workspaceId),
  })
);

export const projectDomains = pgTable(
  "project_domains",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    domain: text("domain").notNull(),

    isDefault: boolean("is_default").notNull().default(false),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    projectIdx: index("project_domains_project_idx").on(table.projectId),
    userIdx: index("project_domains_user_idx").on(table.userId),
    projectDomainIdx: uniqueIndex("project_domains_project_domain_idx").on(
      table.projectId,
      table.domain
    ),
    projectDefaultIdx: uniqueIndex("project_domains_project_default_idx")
      .on(table.projectId)
      .where(sql`${table.isDefault} = true`),
  })
);

export const projectApiKeys = pgTable(
  "project_api_keys",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),

    name: text("name").notNull(),
    keyPrefix: text("key_prefix").notNull(),
    secretHash: text("secret_hash").notNull().unique(),
    secretEncrypted: text("secret_encrypted"),
    scopes: jsonb("scopes")
      .$type<readonly string[]>()
      .notNull()
      .default(["events", "replay", "errors", "performance"]),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    projectIdx: index("project_api_keys_project_idx").on(table.projectId),
    secretHashIdx: uniqueIndex("project_api_keys_secret_hash_idx").on(
      table.secretHash
    ),
  })
);

/* -------------------------------------------------------------------------- */
/*                              PROJECT SNAPSHOTS                             */
/* -------------------------------------------------------------------------- */

export const projectSnapshots = pgTable(
  "project_snapshots",
  {
    projectId: uuid("project_id")
      .primaryKey()
      .references(() => projects.id, {
        onDelete: "cascade",
      }),

    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, {
        onDelete: "cascade",
      }),

    sourceDomain: text("source_domain"),

    status: text("status").notNull().default("pending"),

    storagePath: text("storage_path"),

    capturedAt: timestamp("captured_at", {
      withTimezone: true,
    }),

    requestedAt: timestamp("requested_at", {
      withTimezone: true,
    }),

    lastAttemptAt: timestamp("last_attempt_at", {
      withTimezone: true,
    }),

    nextAttemptAt: timestamp("next_attempt_at", {
      withTimezone: true,
    }),

    lastError: text("last_error"),

    failureCount: integer("failure_count").notNull().default(0),
  },
  (table) => ({
    workspaceIdx: index("project_snapshots_workspace_idx").on(
      table.workspaceId
    ),
    dueIdx: index("project_snapshots_due_idx").on(
      table.status,
      table.nextAttemptAt,
      table.capturedAt
    ),
  })
);

export const heatmapPageSnapshots = pgTable(
  "heatmap_page_snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),

    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),

    domain: text("domain").notNull(),
    pagePath: text("page_path").notNull(),
    sourceUrl: text("source_url").notNull(),
    device: text("device").notNull().default("desktop"),
    status: text("status").notNull().default("pending"),
    storagePath: text("storage_path"),
    viewportWidth: integer("viewport_width").notNull().default(1280),
    viewportHeight: integer("viewport_height").notNull().default(900),
    pageWidth: integer("page_width"),
    pageHeight: integer("page_height"),
    deviceScaleFactor: doublePrecision("device_scale_factor")
      .notNull()
      .default(1),
    capturedAt: timestamp("captured_at", { withTimezone: true }),
    requestedAt: timestamp("requested_at", { withTimezone: true }),
    lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }),
    lastError: text("last_error"),
    failureCount: integer("failure_count").notNull().default(0),
  },
  (table) => ({
    projectPageDeviceIdx: uniqueIndex(
      "heatmap_page_snapshots_project_page_device_idx"
    ).on(table.projectId, table.domain, table.pagePath, table.device),
    dueIdx: index("heatmap_page_snapshots_due_idx").on(
      table.status,
      table.nextAttemptAt,
      table.capturedAt
    ),
  })
);

export const heatmapPreviewSessions = pgTable(
  "heatmap_preview_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    handleHash: text("handle_hash").notNull().unique(),

    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),

    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),

    projectDomainId: uuid("project_domain_id")
      .notNull()
      .references(() => projectDomains.id, { onDelete: "cascade" }),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    canonicalHostname: text("canonical_hostname").notNull(),
    allowedHostnames: jsonb("allowed_hostnames").$type<string[]>().notNull(),
    pathname: text("pathname").notNull(),
    device: text("device").notNull(),
    previewIntent: text("preview_intent").notNull().default("compatibility"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    supersededAt: timestamp("superseded_at", { withTimezone: true }),
  },
  (table) => ({
    projectIdx: index("heatmap_preview_sessions_project_idx").on(
      table.projectId,
      table.projectDomainId
    ),
    expiryIdx: index("heatmap_preview_sessions_expiry_idx").on(table.expiresAt),
  })
);

/* -------------------------------------------------------------------------- */
/*                                  FEEDBACK                                  */
/* -------------------------------------------------------------------------- */

export const feedback = pgTable(
  "feedback",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),

    message: text("message").notNull(),

    pageUrl: text("page_url"),

    status: text("status").notNull().default("new"),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userUniqueIdx: uniqueIndex("feedback_user_unique_idx").on(table.userId),
    createdIdx: index("feedback_created_idx").on(table.createdAt),
  })
);

/* -------------------------------------------------------------------------- */
/*                                  FUNNELS                                   */
/* -------------------------------------------------------------------------- */

export interface FunnelStepDefinition {
  name: string;
  target: string;
}

export const funnels = pgTable(
  "funnels",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, {
        onDelete: "cascade",
      }),

    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, {
        onDelete: "cascade",
      }),

    name: text("name").notNull(),

    description: text("description"),

    steps: jsonb("steps").$type<FunnelStepDefinition[]>().notNull(),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    workspaceIdx: index("funnels_workspace_idx").on(table.workspaceId),
    projectIdx: index("funnels_project_idx").on(table.projectId),
  })
);

/* -------------------------------------------------------------------------- */
/*                                   GOALS                                    */
/* -------------------------------------------------------------------------- */

export const goals = pgTable(
  "goals",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, {
        onDelete: "cascade",
      }),

    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, {
        onDelete: "cascade",
      }),

    domainId: uuid("domain_id").references(() => projectDomains.id, {
      onDelete: "set null",
    }),

    name: text("name").notNull(),

    type: text("type").notNull(),

    target: doublePrecision("target").notNull(),

    unit: text("unit").notNull(),

    matchTarget: text("match_target").notNull(),

    matchPath: text("match_path"),

    deadline: date("deadline", {
      mode: "string",
    }),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    workspaceIdx: index("goals_workspace_idx").on(table.workspaceId),
    projectIdx: index("goals_project_idx").on(table.projectId),
    domainIdx: index("goals_domain_idx").on(table.domainId),
  })
);

/* -------------------------------------------------------------------------- */
/*                                   EVENTS                                   */
/* -------------------------------------------------------------------------- */

export const events = pgTable(
  "events",
  {
    id: bigint("id", {
      mode: "number",
    })
      .generatedAlwaysAsIdentity()
      .primaryKey(),

    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, {
        onDelete: "cascade",
      }),

    // Nullable so events from older SDK versions remain supported.
    eventId: text("event_id"),

    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, {
        onDelete: "cascade",
      }),

    visitorId: text("visitor_id").notNull(),

    sessionId: text("session_id").notNull(),

    type: text("type").notNull(),

    occurredAt: timestamp("occurred_at", {
      withTimezone: true,
    }).notNull(),

    url: text("url"),
    path: text("path"),
    title: text("title"),
    referrer: text("referrer"),
    referrerDomain: text("referrer_domain"),

    device: text("device"),
    browser: text("browser"),
    browserVersion: text("browser_version"),

    os: text("os"),
    osVersion: text("os_version"),

    screenWidth: bigint("screen_width", {
      mode: "number",
    }),

    screenHeight: bigint("screen_height", {
      mode: "number",
    }),

    viewportWidth: bigint("viewport_width", {
      mode: "number",
    }),

    viewportHeight: bigint("viewport_height", {
      mode: "number",
    }),

    country: text("country"),
    countryCode: text("country_code"),
    region: text("region"),
    city: text("city"),

    timezone: text("timezone"),

    ip: text("ip"),

    userAgent: text("user_agent"),

    language: text("language"),

    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),

    sessionDurationMs: bigint("session_duration_ms", {
      mode: "number",
    }),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    }).defaultNow(),
  },
  (table) => ({
    // PostgreSQL permits multiple NULLs in a unique index, preserving legacy rows.
    projectEventIdUnique: uniqueIndex("events_project_event_id_unique_idx").on(
      table.projectId,
      table.eventId
    ),
    projectIdx: index("events_project_idx").on(table.projectId),
    workspaceIdx: index("events_workspace_idx").on(table.workspaceId),

    visitorIdx: index("events_visitor_idx").on(table.visitorId),

    sessionIdx: index("events_session_idx").on(table.sessionId),

    typeIdx: index("events_type_idx").on(table.type),

    pathIdx: index("events_path_idx").on(table.path),

    browserIdx: index("events_browser_idx").on(table.browser),

    deviceIdx: index("events_device_idx").on(table.device),

    countryIdx: index("events_country_idx").on(table.country),

    countryCodeIdx: index("events_country_code_idx").on(table.countryCode),

    referrerDomainIdx: index("events_referrer_domain_idx").on(
      table.referrerDomain
    ),

    occurredIdx: index("events_occurred_idx").on(table.occurredAt),
  })
);

/* -------------------------------------------------------------------------- */
/*                         VISITOR CAMPAIGN ATTRIBUTION                      */
/* -------------------------------------------------------------------------- */

export const visitorCampaignAttribution = pgTable(
  "visitor_campaign_attribution",
  {
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, {
        onDelete: "cascade",
      }),

    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, {
        onDelete: "cascade",
      }),

    visitorId: text("visitor_id").notNull(),

    utmSource: text("utm_source"),
    utmMedium: text("utm_medium"),
    utmCampaign: text("utm_campaign"),
    utmTerm: text("utm_term"),
    utmContent: text("utm_content"),

    landingUrl: text("landing_url"),

    firstSeenAt: timestamp("first_seen_at", {
      withTimezone: true,
    }).notNull(),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    primaryKey: primaryKey({
      columns: [table.workspaceId, table.projectId, table.visitorId],
      name: "visitor_campaign_attribution_pk",
    }),
    projectIdx: index("visitor_campaign_attribution_project_idx").on(
      table.projectId
    ),
    campaignIdx: index("visitor_campaign_attribution_campaign_idx").on(
      table.projectId,
      table.utmCampaign
    ),
    firstSeenIdx: index("visitor_campaign_attribution_first_seen_idx").on(
      table.firstSeenAt
    ),
  })
);

/* -------------------------------------------------------------------------- */
/*                              REPLAY SESSIONS                               */
/* -------------------------------------------------------------------------- */

export const replaySessions = pgTable(
  "replay_sessions",
  {
    id: text("id").primaryKey(),

    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, {
        onDelete: "cascade",
      }),

    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, {
        onDelete: "cascade",
      }),

    visitorId: text("visitor_id").notNull(),

    startedAt: timestamp("started_at", {
      withTimezone: true,
    }).notNull(),

    lastSeenAt: timestamp("last_seen_at", {
      withTimezone: true,
    }).notNull(),

    endedAt: timestamp("ended_at", {
      withTimezone: true,
    }),

    screenWidth: integer("screen_width"),
    screenHeight: integer("screen_height"),
    viewportWidth: integer("viewport_width"),
    viewportHeight: integer("viewport_height"),

    url: text("url"),
    path: text("path"),

    lastSequence: integer("last_sequence").notNull().default(-1),
    eventCount: integer("event_count").notNull().default(0),
    byteCount: integer("byte_count").notNull().default(0),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    projectIdx: index("replay_sessions_project_idx").on(table.projectId),
    workspaceIdx: index("replay_sessions_workspace_idx").on(table.workspaceId),
    visitorIdx: index("replay_sessions_visitor_idx").on(table.visitorId),
    lastSeenIdx: index("replay_sessions_last_seen_idx").on(table.lastSeenAt),
  })
);

export const replayChunks = pgTable(
  "replay_chunks",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    sessionId: text("session_id")
      .notNull()
      .references(() => replaySessions.id, {
        onDelete: "cascade",
      }),

    sequence: integer("sequence").notNull(),

    events: jsonb("events").$type<ReplayEvent[]>().notNull(),

    firstTimestamp: timestamp("first_timestamp", {
      withTimezone: true,
    }).notNull(),

    lastTimestamp: timestamp("last_timestamp", {
      withTimezone: true,
    }).notNull(),

    byteCount: integer("byte_count").notNull(),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    sessionSequenceIdx: uniqueIndex("replay_chunks_session_sequence_idx").on(
      table.sessionId,
      table.sequence
    ),
    sessionTimestampIdx: index("replay_chunks_session_timestamp_idx").on(
      table.sessionId,
      table.firstTimestamp
    ),
  })
);
