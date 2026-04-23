import { TabletFrame } from "@/components/frames/device-frames";
import { DashKioskColumns } from "@/components/screens/dashboard-kiosk-columns";
import { Scene } from "@/components/scene";

export default function Page() {
  return (
    <Scene label="Dashboard · kiosk V2 · columns per member">
      <TabletFrame>
        <DashKioskColumns />
      </TabletFrame>
    </Scene>
  );
}
