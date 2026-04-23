import { TabletFrame } from "@/components/frames/device-frames";
import { RoutineKid } from "@/components/screens/routine";
import { Scene } from "@/components/scene";

export default function Page() {
  return (
    <Scene label="Routine · V1 hero card">
      <TabletFrame>
        <RoutineKid />
      </TabletFrame>
    </Scene>
  );
}
