import { TB } from "@/lib/tokens";
import { PhoneFrame } from "@/components/frames/device-frames";
import { CalAgenda, EventModal } from "@/components/screens/calendar";
import { Scene } from "@/components/scene";

export default function Page() {
  return (
    <Scene label="Calendar · event detail · slide-up modal">
      <PhoneFrame>
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            background: TB.bg2,
          }}
        >
          <CalAgenda />
          <EventModal />
        </div>
      </PhoneFrame>
    </Scene>
  );
}
