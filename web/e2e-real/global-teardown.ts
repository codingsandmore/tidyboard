/**
 * global-teardown.ts
 *
 * Runs after all real-stack e2e tests finish.
 * Stops the Go server process started in global-setup.ts and
 * optionally tears down Docker services.
 */

import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// Path where global-setup writes the Go server PID.
const PID_FILE = path.join(os.tmpdir(), "tidyboard-e2e-server.pid");

export default async function globalTeardown() {
  // Stop Go server
  if (fs.existsSync(PID_FILE)) {
    const pid = fs.readFileSync(PID_FILE, "utf-8").trim();
    try {
      process.kill(parseInt(pid, 10), "SIGTERM");
      console.log(`[teardown] Sent SIGTERM to Go server (PID ${pid})`);
    } catch {
      // Process may already be gone — that is fine.
    }
    fs.rmSync(PID_FILE, { force: true });
  }

  // Stop Docker services (only if we started them — indicated by env flag).
  if (process.env.E2E_REAL_DOCKER_STARTED === "1") {
    const repoRoot = path.join(__dirname, "..", "..");
    try {
      execSync("docker compose stop postgres redis", {
        cwd: repoRoot,
        stdio: "inherit",
      });
      console.log("[teardown] Docker services stopped");
    } catch (err) {
      console.warn("[teardown] docker compose stop failed (non-fatal):", err);
    }
  }
}
