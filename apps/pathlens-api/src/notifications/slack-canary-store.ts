import type { Pool } from "pg";

import { CANARY_TARGET } from "./slack-canary";
import {
  APPROVED_CHANNEL,
  APPROVED_HASH,
  APPROVED_PERIOD,
  CANARY_OPERATION_ID,
  type CanaryStore,
} from "./slack-canary-send";

export const RESERVE_CANARY_SQL = `INSERT INTO audit_logs
  (id,workspace_id,actor_user_id,project_id,action,resource_type,resource_id,metadata)
  VALUES ($1::uuid,$2::uuid,$3::uuid,$4::uuid,
    'slack.canary.attempt_consumed','slack_canary',$1::text,$5::jsonb)
  ON CONFLICT (id) DO NOTHING RETURNING id`;

export class CanaryPersistenceError extends Error {
  constructor(
    public readonly phase: string,
    public readonly databaseCode?: string
  ) {
    super(
      `Canary persistence failed during ${phase}. Never retry the send command.`
    );
  }
}

export function createCanaryStore(
  pool: Pick<Pool, "connect">,
  actorUserId: string
): CanaryStore {
  const metadata = {
    status: "UNKNOWN",
    channel: APPROVED_CHANNEL,
    integrationId: CANARY_TARGET.integrationId,
    payloadHash: APPROVED_HASH,
    period: APPROVED_PERIOD,
    attemptConsumed: true,
  };
  return {
    async reserve() {
      let phase = "connection";
      const client = await pool.connect().catch(() => {
        throw new CanaryPersistenceError(phase);
      });
      let committed = false;
      try {
        phase = "begin";
        await client.query("BEGIN READ WRITE");
        await client.query("SET LOCAL synchronous_commit = on");
        phase = "reservation";
        const inserted = await client.query(RESERVE_CANARY_SQL, [
          CANARY_OPERATION_ID,
          CANARY_TARGET.workspaceId,
          actorUserId,
          CANARY_TARGET.projectId,
          JSON.stringify(metadata),
        ]);
        phase = "commit";
        await client.query("COMMIT");
        committed = true;
        if (inserted.rowCount === 0) return false;
        if (inserted.rowCount !== 1)
          throw new Error("Unexpected reservation result.");
        phase = "post_commit_verification";
        const verified = await client.query(
          `SELECT id FROM audit_logs WHERE id=$1::uuid
           AND resource_id=$1::text AND action='slack.canary.attempt_consumed'
           AND resource_type='slack_canary' AND workspace_id=$2::uuid
           AND project_id=$3::uuid AND metadata @> $4::jsonb`,
          [
            CANARY_OPERATION_ID,
            CANARY_TARGET.workspaceId,
            CANARY_TARGET.projectId,
            JSON.stringify(metadata),
          ]
        );
        if (verified.rowCount !== 1)
          throw new Error("Reservation not verified.");
        return true;
      } catch (error) {
        if (!committed) await client.query("ROLLBACK").catch(() => {});
        const code = (error as { code?: string }).code;
        throw new CanaryPersistenceError(
          phase,
          /^[0-9A-Z]{5}$/.test(code ?? "") ? code : undefined
        );
      } finally {
        client.release();
      }
    },
    async record(status, ts) {
      const client = await pool.connect();
      try {
        const result = await client.query(
          `UPDATE audit_logs SET metadata=metadata || $2::jsonb
           WHERE id=$1::uuid AND action='slack.canary.attempt_consumed'`,
          [
            CANARY_OPERATION_ID,
            JSON.stringify({ status, ...(ts ? { ts } : {}) }),
          ]
        );
        if (result.rowCount !== 1)
          throw new CanaryPersistenceError("record_result");
      } finally {
        client.release();
      }
    },
  };
}
