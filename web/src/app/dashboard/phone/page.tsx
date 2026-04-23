import { PhoneFrame } from "@/components/frames/device-frames";
import { DashPhone } from "@/components/screens/dashboard-phone";
import { Scene } from "@/components/scene";

export default function Page() {
  return (
    <Scene label="Dashboard · phone">
      <PhoneFrame>
        <DashPhone />
      </PhoneFrame>
    </Scene>
  );
}
