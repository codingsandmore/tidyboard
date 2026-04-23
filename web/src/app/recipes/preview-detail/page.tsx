import { PhoneFrame } from "@/components/frames/device-frames";
import { RecipeDetail } from "@/components/screens/recipes";
import { Scene } from "@/components/scene";

export default function Page() {
  return (
    <Scene label="Recipes · detail">
      <PhoneFrame>
        <RecipeDetail />
      </PhoneFrame>
    </Scene>
  );
}
