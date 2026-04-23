import { PhoneFrame } from "@/components/frames/device-frames";
import { RecipePreview } from "@/components/screens/recipes";
import { Scene } from "@/components/scene";

export default function Page() {
  return (
    <Scene label="Recipes · review & save">
      <PhoneFrame>
        <RecipePreview />
      </PhoneFrame>
    </Scene>
  );
}
