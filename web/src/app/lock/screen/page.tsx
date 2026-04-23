import { TabletFrame } from "@/components/frames/device-frames";
import { KioskLock } from "@/components/screens/routine";
import { Scene } from "@/components/scene";

export default function Page() {
  return (
    <Scene label="Kiosk · lock screen">
      <TabletFrame>
        <KioskLock />
      </TabletFrame>
    </Scene>
  );
}
