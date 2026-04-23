import { TabletFrame } from "@/components/frames/device-frames";
import { CalWeek } from "@/components/screens/calendar";
import { Scene } from "@/components/scene";

export default function Page() {
  return (
    <Scene label="Calendar · week">
      <TabletFrame w={768} h={596}>
        <CalWeek />
      </TabletFrame>
    </Scene>
  );
}
