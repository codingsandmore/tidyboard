/**
 * Unified task projection (issue #85).
 *
 * The Cozyla-informed family hub asks for one task feed that surfaces:
 *   - to-dos (modeled today as ad-hoc tasks)
 *   - routines
 *   - chores
 *   - rewards (catalog items the kid is saving toward / can redeem)
 *   - approvals (redemption requests + ad-hoc tasks awaiting an admin)
 *
 * We deliberately do NOT replace the existing screens. This module is a
 * pure projector that takes the raw API shapes already used by
 * chores-kid / wallet-kid / rewards-kid / quick-award and folds them
 * into one `UnifiedTask[]` ordered by urgency.
 *
 * Pet members are first-class in the roster (see issue #82) but are
 * excluded from wallet/reward projections per the issue body's
 * out-of-scope clause: "Do not award wallets/rewards to pets."
 */
import type {
  ApiAdHocTask,
  ApiChore,
  ApiRedemption,
  ApiReward,
  ApiRoutine,
} from "@/lib/api/types";

/** Discriminator for which source the task came from. */
export type UnifiedTaskKind =
  | "todo"
  | "routine"
  | "chore"
  | "reward"
  | "approval";

/**
 * Reward state mirrors the spec's acceptance criterion:
 *   "Reward states include available, pending approval, and redeemed
 *   where supported."
 */
export type RewardState =
  | "available"
  | "pending_approval"
  | "redeemed";

export interface UnifiedTask {
  /**
   * Stable id, namespaced with the source kind so chores/rewards/etc.
   * cannot collide on raw uuid.
   */
  id: string;
  kind: UnifiedTaskKind;
  /** Display title — chore.name, routine.name, reward.name, etc. */
  title: string;
  /**
   * Member this task belongs to. `undefined` for unassigned routines
   * and reward catalog items that aren't pinned to a saver.
   */
  memberId?: string;
  /** Sub-state for the reward kind. Other kinds leave this unset. */
  rewardState?: RewardState;
  /**
   * Higher = more urgent. Approvals outrank everything (admin queue);
   * redemptions awaiting fulfillment outrank to-dos; routines and
   * chores share a band; the reward catalog ranks last.
   */
  priority: number;
  /** Pass-through reference id from the source row, for debugging. */
  sourceId: string;
}

/**
 * Inputs to the projector. Each list is optional — callers wire only
 * the sources they have. Members are required because we use the
 * roster to gate pet exclusions and member-filter validation.
 */
export interface UnifyTasksSources {
  /**
   * Members of the household, including pets. Used solely to skip
   * pet-owned chores from wallet/reward-flavored projections.
   */
  members?: Array<{ id: string; role?: string; age_group?: string }>;
  todos?: ApiAdHocTask[];
  routines?: ApiRoutine[];
  chores?: ApiChore[];
  rewards?: ApiReward[];
  redemptions?: ApiRedemption[];
}

/** Priority bands. Approvals first; reward catalog last. */
const PRIORITY = {
  approval: 100,
  redemption_pending: 80,
  todo: 60,
  routine: 40,
  chore: 40,
  reward_catalog: 20,
} as const;

function isPet(
  members: UnifyTasksSources["members"] | undefined,
  memberId: string | null | undefined,
): boolean {
  if (!members || !memberId) return false;
  const m = members.find((mm) => mm.id === memberId);
  if (!m) return false;
  return m.role === "pet" || m.age_group === "pet";
}

/**
 * Project the supplied sources into a single ordered task feed.
 *
 * Ordering: descending priority. Within a band the projector preserves
 * the input order so callers can pre-sort by due-date, recency, etc.
 */
export function unifyTasks(sources: UnifyTasksSources = {}): UnifiedTask[] {
  const members = sources.members;
  const out: UnifiedTask[] = [];

  // Approvals come from two backends:
  //   1. Pending redemption requests (rewards admin gate)
  //   2. Ad-hoc tasks in `pending` status (chore admin gate)
  for (const r of sources.redemptions ?? []) {
    if (r.status === "pending") {
      out.push({
        id: `approval:redemption:${r.id}`,
        kind: "approval",
        title: "Redemption awaiting approval",
        memberId: r.member_id,
        priority: PRIORITY.approval,
        sourceId: r.id,
      });
    }
  }
  for (const t of sources.todos ?? []) {
    if (t.status === "pending" && t.requires_approval) {
      out.push({
        id: `approval:todo:${t.id}`,
        kind: "approval",
        title: `${t.name} (awaiting approval)`,
        memberId: t.member_id,
        priority: PRIORITY.approval,
        sourceId: t.id,
      });
    }
  }

  // To-dos: only the open ones the kid still needs to act on.
  for (const t of sources.todos ?? []) {
    if (t.status !== "open") continue;
    out.push({
      id: `todo:${t.id}`,
      kind: "todo",
      title: t.name,
      memberId: t.member_id,
      priority: PRIORITY.todo,
      sourceId: t.id,
    });
  }

  // Routines: skip archived; member_id may be null (household-wide).
  for (const r of sources.routines ?? []) {
    if (r.archived) continue;
    out.push({
      id: `routine:${r.id}`,
      kind: "routine",
      title: r.name,
      memberId: r.member_id ?? undefined,
      priority: PRIORITY.routine,
      sourceId: r.id,
    });
  }

  // Chores: archived chores stay out of the feed; pet-owned chores are
  // surfaced for the assigned (human) member. The `pet_member_ids`
  // linkage is informational and never makes a pet the assignee, so
  // wallet payout safeguards stay intact.
  for (const c of sources.chores ?? []) {
    if (c.archived_at) continue;
    // The wallet/payout guardrail: a chore whose owner field somehow
    // points to a pet is dropped from the unified feed entirely. This
    // matches the issue's "Do not award wallets/rewards to pets" rule.
    if (isPet(members, c.member_id)) continue;
    out.push({
      id: `chore:${c.id}`,
      kind: "chore",
      title: c.name,
      memberId: c.member_id,
      priority: PRIORITY.chore,
      sourceId: c.id,
    });
  }

  // Rewards: catalog rendering. We split redeemed/pending/available
  // states from the ApiRedemption rows. A reward's `member_id` is
  // catalog-wide — the projection only attaches a member when there
  // is a redemption referencing it.
  const redemptionsByReward = new Map<string, ApiRedemption[]>();
  for (const r of sources.redemptions ?? []) {
    const list = redemptionsByReward.get(r.reward_id) ?? [];
    list.push(r);
    redemptionsByReward.set(r.reward_id, list);
  }
  for (const reward of sources.rewards ?? []) {
    if (!reward.active) continue;
    const reds = redemptionsByReward.get(reward.id) ?? [];
    if (reds.length === 0) {
      out.push({
        id: `reward:${reward.id}`,
        kind: "reward",
        title: reward.name,
        rewardState: "available",
        priority: PRIORITY.reward_catalog,
        sourceId: reward.id,
      });
      continue;
    }
    // Each redemption produces its own row so per-member state is
    // visible: pending → high priority; fulfilled → archive.
    for (const red of reds) {
      let state: RewardState;
      let priority: number;
      switch (red.status) {
        case "pending":
          state = "pending_approval";
          priority = PRIORITY.redemption_pending;
          break;
        case "approved":
        case "fulfilled":
          state = "redeemed";
          priority = PRIORITY.reward_catalog;
          break;
        case "declined":
          // Declined redemptions don't surface in the kid feed;
          // they fall back to catalog availability.
          state = "available";
          priority = PRIORITY.reward_catalog;
          break;
        default:
          state = "available";
          priority = PRIORITY.reward_catalog;
      }
      out.push({
        id: `reward:${reward.id}:${red.id}`,
        kind: "reward",
        title: reward.name,
        memberId: red.member_id,
        rewardState: state,
        priority,
        sourceId: red.id,
      });
    }
  }

  // Stable sort by descending priority — preserves source order
  // within bands by walking with a numeric tiebreaker on insertion.
  return out
    .map((t, i) => ({ t, i }))
    .sort((a, b) => b.t.priority - a.t.priority || a.i - b.i)
    .map((x) => x.t);
}

/** Narrow a unified feed to a single member. */
export function filterTasksByMember(
  tasks: UnifiedTask[],
  memberId: string | undefined,
): UnifiedTask[] {
  if (!memberId) return tasks;
  return tasks.filter((t) => t.memberId === memberId);
}
