import { TabletFrame } from "@/components/frames/device-frames";
import { EquityScales } from "@/components/screens/equity";
import { Scene } from "@/components/scene";

export default function Page() {
  return (
    <Scene label="Equity · scales metaphor">
      <TabletFrame>
        <EquityScales />
      </TabletFrame>
    </Scene>
  );
}
