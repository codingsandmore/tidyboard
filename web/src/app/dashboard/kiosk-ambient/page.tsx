import { TabletFrame } from "@/components/frames/device-frames";
import { DashKioskAmbient } from "@/components/screens/dashboard-kiosk-ambient";
import { Scene } from "@/components/scene";

export default function Page() {
  return (
    <Scene label="Dashboard · kiosk V3 · ambient tiles">
      <TabletFrame>
        <DashKioskAmbient />
      </TabletFrame>
    </Scene>
  );
}
