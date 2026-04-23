import { TabletFrame } from "@/components/frames/device-frames";
import { CalDay } from "@/components/screens/calendar";
import { Scene } from "@/components/scene";

export default function Page() {
  return (
    <Scene label="Calendar · day · column per member">
      <TabletFrame>
        <CalDay />
      </TabletFrame>
    </Scene>
  );
}
