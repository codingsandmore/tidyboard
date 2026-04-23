import { TabletFrame } from "@/components/frames/device-frames";
import { DashKiosk } from "@/components/screens/dashboard-kiosk";
import { Scene } from "@/components/scene";

export default function Page() {
  return (
    <Scene label="Dashboard · kiosk · dark mode">
      <TabletFrame>
        <DashKiosk dark />
      </TabletFrame>
    </Scene>
  );
}
