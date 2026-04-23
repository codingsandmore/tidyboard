import { TabletFrame } from "@/components/frames/device-frames";
import { Race } from "@/components/screens/equity";
import { Scene } from "@/components/scene";

export default function Page() {
  return (
    <Scene label="Race · chore gamification">
      <TabletFrame>
        <Race />
      </TabletFrame>
    </Scene>
  );
}
