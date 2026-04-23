import { PhoneFrame } from "@/components/frames/device-frames";
import { ListDetail } from "@/components/screens/lists";
import { Scene } from "@/components/scene";
import { TBD } from "@/lib/data";

export default function Page() {
  return (
    <Scene label="List Detail">
      <PhoneFrame>
        <ListDetail list={TBD.lists[0]} />
      </PhoneFrame>
    </Scene>
  );
}
