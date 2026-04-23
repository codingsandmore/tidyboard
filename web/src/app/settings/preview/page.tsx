import { PhoneFrame } from "@/components/frames/device-frames";
import { Settings } from "@/components/screens/equity";
import { Scene } from "@/components/scene";

export default function Page() {
  return (
    <Scene label="Settings · iOS-style">
      <PhoneFrame>
        <Settings />
      </PhoneFrame>
    </Scene>
  );
}
