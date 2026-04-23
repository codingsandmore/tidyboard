import { TabletFrame } from "@/components/frames/device-frames";
import { RoutineChecklist } from "@/components/screens/routine";
import { Scene } from "@/components/scene";

export default function Page() {
  return (
    <Scene label="Routine · V2 checklist">
      <TabletFrame>
        <RoutineChecklist />
      </TabletFrame>
    </Scene>
  );
}
