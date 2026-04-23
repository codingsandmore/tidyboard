import { TabletFrame } from "@/components/frames/device-frames";
import { CalDay } from "@/components/screens/calendar";
import { Scene } from "@/components/scene";

export default function Page() {
  return (
    <Scene label="Calendar · day · dark mode">
      <TabletFrame>
        <CalDay dark />
      </TabletFrame>
    </Scene>
  );
}
