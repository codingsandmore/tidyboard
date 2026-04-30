import { DashKiosk } from "@/components/screens/dashboard-kiosk";

export default function Page() {
  return (
    <main
      data-testid="kiosk-dashboard-page"
      style={{ width: "100vw", height: "100vh", overflow: "hidden" }}
    >
      <DashKiosk />
    </main>
  );
}
