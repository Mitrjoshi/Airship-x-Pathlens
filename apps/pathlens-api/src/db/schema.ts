import {
  bigint,
  boolean,
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
import type { Permission } from "@workspace/contracts";
import type { ReplayEvent } from "@workspace/contracts";

/* -------------------------------------------------------------------------- */
/*                                    USERS                                   */
/* -------------------------------------------------------------------------- */

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),

  name: text("name").notNull(),
  password: text("password").notNull(),

  email: text("email").notNull().unique(),

  avatar: text("avatar"),

  createdAt: timestamp("created_at", {
    withTimezone: true,
  }).defaultNow(),
});

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

    domain: text("domain"),

    description: text("description"),

    apiKey: text("api_key").notNull().unique(),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    }).defaultNow(),
  },
  (table) => ({
    workspaceIdx: index("projects_workspace_idx").on(table.workspaceId),
    apiKeyIdx: uniqueIndex("projects_api_key_idx").on(table.apiKey),
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

    workspaceId: uuid("workspace_id").references(() => workspaces.id, {
      onDelete: "set null",
    }),

    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),

    category: text("category").notNull(),

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
    userIdx: index("feedback_user_idx").on(table.userId),
    workspaceIdx: index("feedback_workspace_idx").on(table.workspaceId),
    projectIdx: index("feedback_project_idx").on(table.projectId),
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
