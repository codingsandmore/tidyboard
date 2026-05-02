import { describe, it, expect } from "vitest";
import { unifyTasks, filterTasksByMember } from "./unified-tasks";
import type {
  ApiAdHocTask,
  ApiChore,
  ApiRedemption,
  ApiReward,
  ApiRoutine,
} from "@/lib/api/types";

const FRED = "fred-id";
const WILMA = "wilma-id";
const PEBBLES = "pebbles-id";
const DINO = "dino-id";

const members = [
  { id: FRED, role: "admin", age_group: "adult" },
  { id: WILMA, role: "admin", age_group: "adult" },
  { id: PEBBLES, role: "child", age_group: "child" },
  { id: DINO, role: "pet", age_group: "pet" },
];

function chore(over: Partial<ApiChore> = {}): ApiChore {
  return {
    id: over.id ?? "chore-1",
    household_id: "h",
    member_id: over.member_id ?? PEBBLES,
    name: over.name ?? "Wash dishes",
    weight: 1,
    frequency_kind: "daily",
    days_of_week: [],
    auto_approve: false,
    archived_at: over.archived_at ?? null,
    created_at: "",
    updated_at: "",
    ...over,
  };
}

function routine(over: Partial<ApiRoutine> = {}): ApiRoutine {
  return {
    id: over.id ?? "rt-1",
    household_id: "h",
    name: over.name ?? "Bedtime",
    member_id: over.member_id ?? PEBBLES,
    days_of_week: [],
    time_slot: "evening",
    archived: over.archived ?? false,
    sort_order: 0,
    steps: [],
    created_at: "",
    updated_at: "",
    ...over,
  };
}

function todo(over: Partial<ApiAdHocTask> = {}): ApiAdHocTask {
  return {
    id: over.id ?? "todo-1",
    household_id: "h",
    member_id: over.member_id ?? PEBBLES,
    name: over.name ?? "Take out trash",
    payout_cents: 100,
    requires_approval: over.requires_approval ?? false,
    status: over.status ?? "open",
    completed_at: null,
    approved_at: null,
    ...over,
  } as ApiAdHocTask;
}

function reward(over: Partial<ApiReward> = {}): ApiReward {
  return {
    id: over.id ?? "rw-1",
    household_id: "h",
    name: over.name ?? "TV night",
    description: "",
    image_url: null,
    cost_points: 50,
    fulfillment_kind: "self_serve",
    active: over.active ?? true,
    created_at: "",
    updated_at: "",
    ...over,
  };
}

function redemption(over: Partial<ApiRedemption> = {}): ApiRedemption {
  return {
    id: over.id ?? "red-1",
    household_id: "h",
    reward_id: over.reward_id ?? "rw-1",
    member_id: over.member_id ?? PEBBLES,
    points_at_redemption: 50,
    status: over.status ?? "pending",
    requested_at: "",
    decided_at: null,
    decided_by_account_id: null,
    fulfilled_at: null,
    decline_reason: "",
    grant_id: null,
    ...over,
  };
}

describe("unifyTasks — source projection", () => {
  it("projects a chore", () => {
    const out = unifyTasks({ members, chores: [chore({ id: "c1" })] });
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      id: "chore:c1",
      kind: "chore",
      title: "Wash dishes",
      memberId: PEBBLES,
    });
  });

  it("projects a routine, dropping archived ones", () => {
    const out = unifyTasks({
      members,
      routines: [routine({ id: "rt-a" }), routine({ id: "rt-b", archived: true })],
    });
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe("routine:rt-a");
    expect(out[0].kind).toBe("routine");
  });

  it("projects open to-dos and elevates pending-approval ones", () => {
    const out = unifyTasks({
      members,
      todos: [
        todo({ id: "t-open" }),
        todo({ id: "t-pending", status: "pending", requires_approval: true }),
      ],
    });
    const kinds = out.map((t) => t.kind);
    expect(kinds).toContain("todo");
    expect(kinds).toContain("approval");
    // Approval must outrank the open to-do.
    expect(out[0].kind).toBe("approval");
  });

  it("projects reward catalog as available when no redemption", () => {
    const out = unifyTasks({ members, rewards: [reward()] });
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ kind: "reward", rewardState: "available" });
  });

  it("projects pending redemptions as approval queue items", () => {
    const out = unifyTasks({
      members,
      rewards: [reward()],
      redemptions: [redemption({ status: "pending" })],
    });
    const approvals = out.filter((t) => t.kind === "approval");
    const rewards = out.filter((t) => t.kind === "reward");
    expect(approvals).toHaveLength(1);
    expect(approvals[0].memberId).toBe(PEBBLES);
    // Reward row reflects pending-approval state too.
    expect(rewards[0].rewardState).toBe("pending_approval");
  });

  it("marks fulfilled redemptions as redeemed", () => {
    const out = unifyTasks({
      members,
      rewards: [reward()],
      redemptions: [redemption({ status: "fulfilled" })],
    });
    const rewardRow = out.find((t) => t.kind === "reward");
    expect(rewardRow?.rewardState).toBe("redeemed");
  });

  it("excludes pet-owned chores (no wallet/reward for pets)", () => {
    const out = unifyTasks({
      members,
      chores: [
        chore({ id: "human", member_id: PEBBLES }),
        chore({ id: "pet", member_id: DINO, name: "Feed dino" }),
      ],
    });
    expect(out.map((t) => t.id)).toEqual(["chore:human"]);
  });

  it("orders approvals before to-dos before routines/chores before catalog", () => {
    const out = unifyTasks({
      members,
      chores: [chore()],
      routines: [routine()],
      todos: [
        todo({ id: "open" }),
        todo({ id: "pending", status: "pending", requires_approval: true }),
      ],
      // Two catalog rewards: rw-1 with a pending redemption (high band)
      // and rw-2 untouched (catalog band).
      rewards: [reward({ id: "rw-1" }), reward({ id: "rw-2" })],
      redemptions: [
        redemption({ id: "red-pending", reward_id: "rw-1", status: "pending" }),
      ],
    });
    const kindOrder = out.map((t) => t.kind);
    // Approvals first (2: redemption + pending todo).
    expect(kindOrder.slice(0, 2).every((k) => k === "approval")).toBe(true);
    // Plain catalog reward (rw-2) is last.
    expect(out[out.length - 1]).toMatchObject({
      kind: "reward",
      sourceId: "rw-2",
      rewardState: "available",
    });
  });
});

describe("filterTasksByMember", () => {
  it("returns the input unchanged when no member is selected", () => {
    const out = unifyTasks({
      members,
      chores: [chore({ id: "c1", member_id: PEBBLES })],
      todos: [todo({ id: "t1", member_id: WILMA })],
    });
    expect(filterTasksByMember(out, undefined)).toEqual(out);
  });

  it("narrows the feed to a single member", () => {
    const all = unifyTasks({
      members,
      chores: [
        chore({ id: "c-pebs", member_id: PEBBLES }),
        chore({ id: "c-wilma", member_id: WILMA }),
      ],
      routines: [
        routine({ id: "rt-pebs", member_id: PEBBLES }),
        routine({ id: "rt-house", member_id: null }),
      ],
    });
    const pebs = filterTasksByMember(all, PEBBLES);
    expect(pebs.every((t) => t.memberId === PEBBLES)).toBe(true);
    expect(pebs.map((t) => t.id)).toContain("chore:c-pebs");
    expect(pebs.map((t) => t.id)).not.toContain("chore:c-wilma");
    // Unassigned routine drops out under a per-member filter.
    expect(pebs.map((t) => t.id)).not.toContain("routine:rt-house");
  });
});
