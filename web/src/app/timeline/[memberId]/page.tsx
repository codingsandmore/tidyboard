"use client";
import { use } from "react";
import { Timeline } from "@/components/screens/timeline";

export default function Page({ params }: { params: Promise<{ memberId: string }> }) {
  const { memberId } = use(params);
  return <Timeline memberId={memberId} />;
}
