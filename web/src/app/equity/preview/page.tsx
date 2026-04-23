import { LaptopFrame } from "@/components/frames/device-frames";
import { Equity } from "@/components/screens/equity";
import { Scene } from "@/components/scene";

export default function Page() {
  return (
    <Scene label="Equity · full dashboard">
      <LaptopFrame>
        <Equity />
      </LaptopFrame>
    </Scene>
  );
}
