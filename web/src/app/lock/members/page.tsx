import { TabletFrame } from "@/components/frames/device-frames";
import { KioskLockMembers } from "@/components/screens/routine";
import { Scene } from "@/components/scene";

export default function Page() {
  return (
    <Scene label="Kiosk · member picker">
      <TabletFrame>
        <KioskLockMembers />
      </TabletFrame>
    </Scene>
  );
}
