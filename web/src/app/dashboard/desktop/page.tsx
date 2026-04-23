import { LaptopFrame } from "@/components/frames/device-frames";
import { DashDesktop } from "@/components/screens/dashboard-desktop";
import { Scene } from "@/components/scene";

export default function Page() {
  return (
    <Scene label="Dashboard · desktop 3-column" pad={24}>
      <LaptopFrame>
        <DashDesktop />
      </LaptopFrame>
    </Scene>
  );
}
