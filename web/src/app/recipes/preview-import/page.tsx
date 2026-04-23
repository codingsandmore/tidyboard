import { PhoneFrame } from "@/components/frames/device-frames";
import { RecipeImport } from "@/components/screens/recipes";
import { Scene } from "@/components/scene";

export default function Page() {
  return (
    <Scene label="Recipes · import URL">
      <PhoneFrame>
        <RecipeImport />
      </PhoneFrame>
    </Scene>
  );
}
