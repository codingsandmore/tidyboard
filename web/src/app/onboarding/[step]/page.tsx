import { notFound } from "next/navigation";
import { PhoneFrame } from "@/components/frames/device-frames";
import { Onboarding, ONBOARDING_LABELS } from "@/components/screens/onboarding";
import { Scene } from "@/components/scene";

export function generateStaticParams() {
  return [0, 1, 2, 3, 4, 5, 6].map((i) => ({ step: String(i) }));
}

export default async function OnboardingStep({
  params,
}: {
  params: Promise<{ step: string }>;
}) {
  const { step } = await params;
  const n = Number(step);
  if (!Number.isInteger(n) || n < 0 || n > 6) notFound();
  return (
    <Scene label={`Onboarding · ${n + 1} / 7 · ${ONBOARDING_LABELS[n]}`}>
      <PhoneFrame>
        <Onboarding step={n} />
      </PhoneFrame>
    </Scene>
  );
}
