import { TabletFrame } from "@/components/frames/device-frames";
import { CalMonth } from "@/components/screens/calendar";
import { Scene } from "@/components/scene";

export default function Page() {
  return (
    <Scene label="Calendar · month">
      <TabletFrame w={768} h={596}>
        <CalMonth />
      </TabletFrame>
    </Scene>
  );
}
