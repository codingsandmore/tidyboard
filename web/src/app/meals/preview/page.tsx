import { TabletFrame } from "@/components/frames/device-frames";
import { MealPlan } from "@/components/screens/recipes";
import { Scene } from "@/components/scene";

export default function Page() {
  return (
    <Scene label="Meal Plan · weekly grid">
      <TabletFrame>
        <MealPlan />
      </TabletFrame>
    </Scene>
  );
}
