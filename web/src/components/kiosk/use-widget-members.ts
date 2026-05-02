"use client";

import { useMemo } from "react";
import type { Member } from "@/lib/data";
import { toWidgetMember, type WidgetMember } from "@/lib/family-roster";

/**
 * Project a list of full {@link Member} records into the widget-safe
 * {@link WidgetMember} contract used by the Cozyla kiosk widget templates
 * (#83). Memoised so widget components don't see new array identities on
 * every render.
 */
export function useWidgetMembers(members: Member[] | undefined): WidgetMember[] {
  return useMemo(() => (members ?? []).map(toWidgetMember), [members]);
}
