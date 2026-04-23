import { PhoneFrame } from "@/components/frames/device-frames";
import { ListsIndex } from "@/components/screens/lists";
import { Scene } from "@/components/scene";

export default function Page() {
  return (
    <Scene label="Lists Index">
      <PhoneFrame>
        <ListsIndex />
      </PhoneFrame>
    </Scene>
  );
}
