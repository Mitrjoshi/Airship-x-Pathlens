import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const WORKER_REQUIRED_VARIABLES = [
  "DATABASE_URL",
  "DATABASE_SSL_REQUIRED",
  "DATABASE_SSL_CA",
  "INTEGRATION_ENCRYPTION_KEY",
  "FRONTEND_URL",
  "PATHLENS_NOTIFICATION_SMOKE_TEST",
] as const;

export const DISPATCHER_REQUIRED_VARIABLES = [
  "DATABASE_URL",
  "DATABASE_SSL_REQUIRED",
  "DATABASE_SSL_CA",
  "NOTIFICATION_QUEUE_URL",
  "NOTIFICATION_GRACE_PERIOD_MS",
  "PATHLENS_NOTIFICATION_SMOKE_TEST",
] as const;

const FIXTURE_VARIABLE = "PATHLENS_NOTIFICATION_TEST_INTEGRATION_ID";
const DEFAULT_REGION = "ap-south-1";
const DEFAULT_ACCOUNT = "176246209215";
const DEFAULT_STACK = "pathlens-notifications-staging";
const BASELINE_FILE = join(
  tmpdir(),
  "pathlens-notification-environment-baseline.json"
);

type Variables = Record<string, string>;

type Baseline = {
  account: string;
  region: string;
  stack: string;
  functions: Record<string, Record<string, string>>;
};

function aws(args: string[]) {
  return JSON.parse(
    execFileSync("aws", [...args, "--output", "json"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    })
  ) as Record<string, unknown>;
}

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function fingerprintVariables(variables: Variables) {
  return Object.fromEntries(
    Object.entries(variables)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([name, value]) => [name, hash(value)])
  );
}

export function validateNotificationEnvironment(
  functionName: string,
  variables: Variables
) {
  const required = functionName.endsWith("-worker")
    ? WORKER_REQUIRED_VARIABLES
    : DISPATCHER_REQUIRED_VARIABLES;
  const errors: string[] = [];

  for (const name of required) {
    if (!variables[name]?.trim()) errors.push(`${name} missing`);
  }
  if (variables["PATHLENS_NOTIFICATION_SMOKE_TEST"] !== "true") {
    errors.push("PATHLENS_NOTIFICATION_SMOKE_TEST is not true");
  }
  if (FIXTURE_VARIABLE in variables) errors.push(`${FIXTURE_VARIABLE} present`);

  if (variables.DATABASE_SSL_CA !== "/var/task/certs/supabase-ca.crt") {
    errors.push("DATABASE_SSL_CA is incorrect");
  }
  if (variables.DATABASE_SSL_REQUIRED !== "true") {
    errors.push("DATABASE_SSL_REQUIRED is not true");
  }

  try {
    const databaseUrl = new URL(variables.DATABASE_URL);
    if (
      databaseUrl.hostname !== "aws-1-ap-south-1.pooler.supabase.com" ||
      databaseUrl.port !== "5432" ||
      databaseUrl.pathname !== "/postgres" ||
      !databaseUrl.username.startsWith("postgres.")
    ) {
      errors.push(
        "DATABASE_URL is not the expected project-qualified staging pooler URL"
      );
    }
  } catch {
    errors.push("DATABASE_URL is invalid");
  }

  if (functionName.endsWith("-worker")) {
    try {
      const frontendUrl = new URL(variables.FRONTEND_URL);
      if (!["http:", "https:"].includes(frontendUrl.protocol)) {
        errors.push("FRONTEND_URL has an unsupported protocol");
      }
    } catch {
      errors.push("FRONTEND_URL is invalid");
    }
  }

  return errors;
}

function readFunctionVariables(region: string, functionName: string) {
  const response = aws([
    "lambda",
    "get-function-configuration",
    "--region",
    region,
    "--function-name",
    functionName,
  ]) as {
    State?: string;
    LastUpdateStatus?: string;
    Environment?: { Variables?: Variables };
  };
  if (
    response.State !== "Active" ||
    response.LastUpdateStatus !== "Successful"
  ) {
    throw new Error(`${functionName} is not Active/Successful`);
  }
  return response.Environment?.Variables ?? {};
}

function getOptions() {
  const args = process.argv.slice(2);
  const mode = args.includes("--before")
    ? "before"
    : args.includes("--after")
      ? "after"
      : undefined;
  if (!mode) throw new Error("Usage: --before or --after");
  const value = (name: string, fallback: string) => {
    const index = args.indexOf(name);
    return index >= 0 ? (args[index + 1] ?? fallback) : fallback;
  };
  return {
    mode,
    region: value("--region", DEFAULT_REGION),
    account: value("--account", DEFAULT_ACCOUNT),
    stack: value("--stack", DEFAULT_STACK),
  };
}

export function run() {
  const options = getOptions();
  const identity = aws([
    "sts",
    "get-caller-identity",
    "--region",
    options.region,
  ]) as {
    Account?: string;
  };
  if (identity.Account !== options.account)
    throw new Error("Unexpected AWS account");

  const functions = {
    dispatcher: `pathlens-notification-staging-dispatcher`,
    worker: `pathlens-notification-staging-worker`,
  };
  const current = Object.fromEntries(
    Object.entries(functions).map(([kind, functionName]) => {
      const variables = readFunctionVariables(options.region, functionName);
      const errors = validateNotificationEnvironment(functionName, variables);
      if (errors.length)
        throw new Error(
          `${kind} environment check failed: ${errors.join(", ")}`
        );
      return [kind, fingerprintVariables(variables)];
    })
  );

  if (options.mode === "before") {
    const baseline: Baseline = {
      account: options.account,
      region: options.region,
      stack: options.stack,
      functions: current,
    };
    writeFileSync(BASELINE_FILE, JSON.stringify(baseline), { mode: 0o600 });
    console.log(
      "Notification environment baseline captured (values not stored).\n"
    );
    return;
  }

  if (!existsSync(BASELINE_FILE)) {
    throw new Error(
      "No before-deployment baseline exists; refusing post-deployment verification"
    );
  }
  const baseline = JSON.parse(readFileSync(BASELINE_FILE, "utf8")) as Baseline;
  if (
    baseline.account !== options.account ||
    baseline.region !== options.region ||
    baseline.stack !== options.stack
  ) {
    throw new Error(
      "Deployment baseline scope does not match post-deployment scope"
    );
  }
  for (const kind of Object.keys(current)) {
    const before = baseline.functions[kind] ?? {};
    const after = current[kind] ?? {};
    const names = new Set([...Object.keys(before), ...Object.keys(after)]);
    const changed = [...names].filter((name) => before[name] !== after[name]);
    if (changed.length) {
      throw new Error(`${kind} environment changed: ${changed.join(", ")}`);
    }
  }
  console.log(
    "Notification environment preserved (hashes compared; values not printed).\n"
  );
}

if (process.argv[1]?.endsWith("verify-notification-environment.ts")) {
  try {
    run();
  } catch (error) {
    console.error(
      error instanceof Error ? error.message : "Environment verification failed"
    );
    process.exitCode = 1;
  }
}
