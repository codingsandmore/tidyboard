/**
 * Cleanup tracker — every entity created during a prod test run gets
 * registered here, then teardown deletes them best-effort in reverse
 * order so we don't pollute prod with E2E debris if a test fails midway.
 */

import {
  apiDeleteEvent,
  apiDeleteHousehold,
  apiDeleteList,
  apiDeleteMember,
  ApiError,
} from "./api";

type Cleanup =
  | { kind: "event"; token: string; id: string }
  | { kind: "list"; token: string; id: string }
  | { kind: "member"; token: string; householdId: string; id: string }
  | { kind: "household"; token: string; id: string };

export class CleanupQueue {
  private items: Cleanup[] = [];

  trackEvent(token: string, id: string) {
    this.items.push({ kind: "event", token, id });
  }
  trackList(token: string, id: string) {
    this.items.push({ kind: "list", token, id });
  }
  trackMember(token: string, householdId: string, id: string) {
    this.items.push({ kind: "member", token, householdId, id });
  }
  trackHousehold(token: string, id: string) {
    this.items.push({ kind: "household", token, id });
  }

  async drain(): Promise<{ ok: number; failed: { kind: string; id: string; reason: string }[] }> {
    let ok = 0;
    const failed: { kind: string; id: string; reason: string }[] = [];

    // Reverse order — child entities (events, list items, members) before
    // their parent household.
    for (const c of [...this.items].reverse()) {
      try {
        switch (c.kind) {
          case "event":
            await apiDeleteEvent(c.token, c.id);
            break;
          case "list":
            await apiDeleteList(c.token, c.id);
            break;
          case "member":
            await apiDeleteMember(c.token, c.householdId, c.id);
            break;
          case "household":
            await apiDeleteHousehold(c.token, c.id);
            break;
        }
        ok++;
      } catch (err) {
        const reason =
          err instanceof ApiError ? `${err.status} ${err.message}` : String(err);
        failed.push({ kind: c.kind, id: c.id, reason });
      }
    }
    this.items = [];
    return { ok, failed };
  }
}
