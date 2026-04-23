import { PhoneFrame } from "@/components/frames/device-frames";
import { CalAgenda } from "@/components/screens/calendar";
import { Scene } from "@/components/scene";

export default function Page() {
  return (
    <Scene label="Calendar · agenda · searchable">
      <PhoneFrame>
        <CalAgenda />
      </PhoneFrame>
    </Scene>
  );
}
