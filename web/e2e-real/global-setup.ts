/**
 * global-setup.ts
 *
 * Runs once before any Playwright test in the e2e-real suite.
 *
 * Responsibilities:
 *   1. Check that Docker is available — skip gracefully if not.
 *   2. Bring up postgres + redis via docker compose (fresh volumes).
 *   3. Wait for postgres to be healthy.
 *   4. Run database migrations via `make migrate`.
 *   5. Start the Go server in the background with TIDYBOARD_ALLOW_RESET=true.
 *   6. Wait until /health returns 200.
 *
 * The Go server PID is written to a temp file so global-teardown.ts can
 * stop it cleanly.
 */

import { execSync, spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { apiWaitForHealth } from "./helpers/api";

const REPO_ROOT = path.join(__dirname, "..", "..");
const PID_FILE = path.join(os.tmpdir(), "tidyboard-e2e-server.pid");
const SERVER_LOG = path.join(os.tmpdir(), "tidyboard-e2e-server.log");

function dockerAvailable(): boolean {
  try {
    execSync("docker info --format json", { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

function waitForPostgres(timeoutMs = 60_000): void {
  const deadline = Date.now() + timeoutMs;
  const interval = 1_000;
  let lastErr = "";

  console.log("[setup] Waiting for postgres to be healthy…");
  while (Date.now() < deadline) {
    try {
      execSync(
        'docker compose exec -T postgres pg_isready -U tidyboard -d tidyboard',
        { cwd: REPO_ROOT, stdio: "pipe" }
      );
      console.log("[setup] Postgres is ready");
      return;
    } catch (e: unknown) {
      lastErr = String(e);
    }
    // Busy-wait with a sync sleep — acceptable in global-setup (Node.js only).
    execSync(`sleep ${interval / 1000}`);
  }
  throw new Error(`Postgres not ready after ${timeoutMs}ms. Last: ${lastErr}`);
}

export default async function globalSetup() {
  // ── 0. Docker availability check ─────────────────────────────────────────
  if (!dockerAvailable()) {
    console.warn(
      "\n[e2e-real] Docker is not available — skipping real-stack tests.\n" +
        "Install Docker Desktop (or Docker Engine) and ensure the daemon is running.\n"
    );
    // Signal tests to skip by setting an env var (checked in fixtures.ts).
    process.env.E2E_REAL_SKIP = "1";
    return;
  }

  // ── 1. Tear down any existing stack and start fresh ──────────────────────
  console.log("[setup] Resetting Docker stack (down -v + up)…");
  execSync("docker compose down -v --remove-orphans 2>&1 || true", {
    cwd: REPO_ROOT,
    stdio: "inherit",
  });
  // Start only postgres and redis — we run the Go server directly so we can
  // pass TIDYBOARD_ALLOW_RESET=true without rebuilding the Docker image.
  execSync("docker compose up -d postgres redis", {
    cwd: REPO_ROOT,
    stdio: "inherit",
  });
  process.env.E2E_REAL_DOCKER_STARTED = "1";

  // ── 2. Wait for postgres ──────────────────────────────────────────────────
  waitForPostgres();

  // ── 3. Run migrations ─────────────────────────────────────────────────────
  console.log("[setup] Running migrations…");
  execSync("make migrate", { cwd: REPO_ROOT, stdio: "inherit" });
  console.log("[setup] Migrations complete");

  // ── 4. Start Go server ───────────────────────────────────────────────────
  // If a previous test run left a server running, stop it.
  if (fs.existsSync(PID_FILE)) {
    const oldPid = fs.readFileSync(PID_FILE, "utf-8").trim();
    try {
      process.kill(parseInt(oldPid, 10), "SIGTERM");
    } catch {
      // Already gone.
    }
    fs.rmSync(PID_FILE, { force: true });
  }

  const serverEnv: NodeJS.ProcessEnv = {
    ...process.env,
    // Database
    TIDYBOARD_DATABASE_HOST: "localhost",
    TIDYBOARD_DATABASE_PORT: "5432",
    TIDYBOARD_DATABASE_NAME: "tidyboard",
    TIDYBOARD_DATABASE_USER: "tidyboard",
    TIDYBOARD_DATABASE_PASSWORD:
      process.env.TIDYBOARD_DB_PASSWORD ?? "tidyboard_dev_password",
    // Redis
    TIDYBOARD_REDIS_HOST: "localhost",
    TIDYBOARD_REDIS_PORT: "6379",
    // Server
    TIDYBOARD_SERVER_HOST: "0.0.0.0",
    TIDYBOARD_SERVER_PORT: "8080",
    TIDYBOARD_AUTH_JWT_SECRET:
      process.env.TIDYBOARD_AUTH_JWT_SECRET ?? "e2e-test-jwt-secret-change-me",
    TIDYBOARD_SERVER_CORS_ORIGINS: "http://localhost:3000",
    // Storage — local mode, no AWS needed
    TIDYBOARD_STORAGE_TYPE: "local",
    TIDYBOARD_STORAGE_LOCAL_PATH: path.join(os.tmpdir(), "tidyboard-e2e-media"),
    // Backup disabled to avoid scheduled goroutine noise
    TIDYBOARD_BACKUP_ENABLED: "false",
    // Reset endpoint enabled for test isolation
    TIDYBOARD_ALLOW_RESET: "true",
  };

  console.log("[setup] Starting Go server…");
  const logStream = fs.createWriteStream(SERVER_LOG, { flags: "a" });

  const serverProc = spawn("go", ["run", "./cmd/server", "serve"], {
    cwd: REPO_ROOT,
    env: serverEnv,
    detached: false,
    stdio: ["ignore", "pipe", "pipe"],
  });

  serverProc.stdout?.pipe(logStream);
  serverProc.stderr?.pipe(logStream);

  serverProc.on("error", (err) => {
    console.error("[setup] Go server failed to start:", err);
  });

  fs.writeFileSync(PID_FILE, String(serverProc.pid ?? ""));
  console.log(
    `[setup] Go server spawned (PID ${serverProc.pid}), log: ${SERVER_LOG}`
  );

  // ── 5. Wait for /health ───────────────────────────────────────────────────
  console.log("[setup] Waiting for /health…");
  await apiWaitForHealth(60_000, 500);
  console.log("[setup] Go server is healthy — starting tests");
}
