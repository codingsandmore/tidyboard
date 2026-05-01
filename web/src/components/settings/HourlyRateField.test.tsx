import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HourlyRateField } from "./HourlyRateField";
import { fred, wilma, pebbles, FLINTSTONE_HOUSEHOLD_ID } from "@/test/fixtures/flintstones";

// ── API hooks mock ─────────────────────────────────────────────────────────

const updateMemberMock = vi.fn();

vi.mock("@/lib/api/hooks", () => ({
  useUpdateMember: () => ({
    mutateAsync: updateMemberMock,
    isPending: false,
  }),
}));

// ── Helpers ────────────────────────────────────────────────────────────────

beforeEach(() => {
  updateMemberMock.mockReset();
  updateMemberMock.mockResolvedValue({ id: fred.id });
});

afterEach(() => {
  vi.restoreAllMocks();
});

type Viewer = { id: string; role: "adult" | "child"; name: string };

type Target = {
  id: string;
  name: string;
  hourly_rate_cents_min?: number | null;
  hourly_rate_cents_max?: number | null;
};

function renderField(
  viewer: Viewer,
  target: Target,
  householdId: string = FLINTSTONE_HOUSEHOLD_ID,
) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <HourlyRateField viewer={viewer} member={target} householdId={householdId} />
    </QueryClientProvider>,
  );
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("HourlyRateField — privacy", () => {
  it("kid does not see hourly rate section when viewing another member", () => {
    renderField(
      { id: pebbles.id, role: "child", name: "Pebbles" },
      {
        id: fred.id,
        name: "Fred",
        hourly_rate_cents_min: 2500,
        hourly_rate_cents_max: 4000,
      },
    );

    // Section is absent entirely — neither labels nor inputs render.
    expect(screen.queryByTestId("hourly-rate-section")).toBeNull();
    expect(screen.queryByTestId("hourly-rate-min")).toBeNull();
    expect(screen.queryByTestId("hourly-rate-max")).toBeNull();
  });

  it("admin sees and edits hourly rate fields", async () => {
    renderField(
      { id: fred.id, role: "adult", name: "Fred" },
      {
        id: wilma.id,
        name: "Wilma",
        hourly_rate_cents_min: 3000,
        hourly_rate_cents_max: 5000,
      },
    );

    const minInput = screen.getByTestId("hourly-rate-min") as HTMLInputElement;
    const maxInput = screen.getByTestId("hourly-rate-max") as HTMLInputElement;

    expect(minInput).toBeTruthy();
    expect(maxInput).toBeTruthy();
    // 3000 cents = $30.00, 5000 cents = $50.00
    expect(minInput.value).toBe("30");
    expect(maxInput.value).toBe("50");

    fireEvent.change(minInput, { target: { value: "15" } });
    fireEvent.change(maxInput, { target: { value: "25" } });
    fireEvent.click(screen.getByTestId("hourly-rate-save"));

    await waitFor(() => {
      expect(updateMemberMock).toHaveBeenCalledTimes(1);
    });
    expect(updateMemberMock).toHaveBeenCalledWith({
      householdId: FLINTSTONE_HOUSEHOLD_ID,
      memberId: wilma.id,
      hourlyRateCentsMin: 1500,
      hourlyRateCentsMax: 2500,
    });
  });

  it("self-edit allowed for own rate (non-admin viewing self)", async () => {
    // A non-admin viewing their own profile should still see and edit.
    renderField(
      { id: pebbles.id, role: "child", name: "Pebbles" },
      {
        id: pebbles.id,
        name: "Pebbles",
        hourly_rate_cents_min: 800,
        hourly_rate_cents_max: 1200,
      },
    );

    const minInput = screen.getByTestId("hourly-rate-min") as HTMLInputElement;
    const maxInput = screen.getByTestId("hourly-rate-max") as HTMLInputElement;
    expect(minInput).toBeTruthy();
    expect(maxInput).toBeTruthy();
    expect(minInput.value).toBe("8");
    expect(maxInput.value).toBe("12");

    fireEvent.change(minInput, { target: { value: "10" } });
    fireEvent.click(screen.getByTestId("hourly-rate-save"));

    await waitFor(() => {
      expect(updateMemberMock).toHaveBeenCalledTimes(1);
    });
    expect(updateMemberMock).toHaveBeenCalledWith({
      householdId: FLINTSTONE_HOUSEHOLD_ID,
      memberId: pebbles.id,
      hourlyRateCentsMin: 1000,
      hourlyRateCentsMax: 1200,
    });
  });

  it("admin viewing self can edit own rate", () => {
    renderField(
      { id: fred.id, role: "adult", name: "Fred" },
      {
        id: fred.id,
        name: "Fred",
        hourly_rate_cents_min: 2500,
        hourly_rate_cents_max: 4000,
      },
    );

    expect(screen.getByTestId("hourly-rate-min")).toBeTruthy();
    expect(screen.getByTestId("hourly-rate-max")).toBeTruthy();
  });

  it("clears value to null when input is empty", async () => {
    renderField(
      { id: fred.id, role: "adult", name: "Fred" },
      {
        id: fred.id,
        name: "Fred",
        hourly_rate_cents_min: 2500,
        hourly_rate_cents_max: 4000,
      },
    );

    const minInput = screen.getByTestId("hourly-rate-min") as HTMLInputElement;
    const maxInput = screen.getByTestId("hourly-rate-max") as HTMLInputElement;
    fireEvent.change(minInput, { target: { value: "" } });
    fireEvent.change(maxInput, { target: { value: "" } });
    fireEvent.click(screen.getByTestId("hourly-rate-save"));

    await waitFor(() => {
      expect(updateMemberMock).toHaveBeenCalledTimes(1);
    });
    expect(updateMemberMock).toHaveBeenCalledWith({
      householdId: FLINTSTONE_HOUSEHOLD_ID,
      memberId: fred.id,
      hourlyRateCentsMin: null,
      hourlyRateCentsMax: null,
    });
  });
});
