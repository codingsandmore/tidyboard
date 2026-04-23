import { PhoneFrame } from "@/components/frames/device-frames";
import { ShoppingList } from "@/components/screens/recipes";
import { Scene } from "@/components/scene";

export default function Page() {
  return (
    <Scene label="Shopping List">
      <PhoneFrame>
        <ShoppingList />
      </PhoneFrame>
    </Scene>
  );
}
