import { TabletFrame } from "@/components/frames/device-frames";
import { RoutinePath } from "@/components/screens/routine";
import { Scene } from "@/components/scene";

export default function Page() {
  return (
    <Scene label="Routine · V3 path / journey">
      <TabletFrame>
        <RoutinePath />
      </TabletFrame>
    </Scene>
  );
}
