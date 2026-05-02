import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { KioskLock } from "./KioskLock";

describe("KioskLock", () => {
  it("renders a PIN input and disabled submit when empty", () => {
    render(
      <KioskLock memberId="m1" onUnlock={() => {}} pinLoginFn={async () => {}} />,
    );
    const input = screen.getByTestId("kiosk-lock-pin-input");
    expect(input).toBeInTheDocument();
    const submit = screen.getByTestId("kiosk-lock-submit") as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
  });

  it("calls the injected pinLoginFn (which wraps POST /v1/auth/pin) on submit", async () => {
    const pinLoginFn = vi.fn().mockResolvedValue(undefined);
    const onUnlock = vi.fn();
    render(
      <KioskLock
        memberId="mem-adult"
        memberName="Wilma"
        onUnlock={onUnlock}
        pinLoginFn={pinLoginFn}
      />,
    );
    const input = screen.getByTestId("kiosk-lock-pin-input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "1234" } });
    fireEvent.click(screen.getByTestId("kiosk-lock-submit"));
    await waitFor(() => expect(pinLoginFn).toHaveBeenCalledWith("mem-adult", "1234"));
    await waitFor(() => expect(onUnlock).toHaveBeenCalledTimes(1));
  });

  it("shows an error and clears the PIN on rejection", async () => {
    const pinLoginFn = vi.fn().mockRejectedValue(new Error("nope"));
    const onUnlock = vi.fn();
    render(
      <KioskLock
        memberId="mem-adult"
        onUnlock={onUnlock}
        pinLoginFn={pinLoginFn}
      />,
    );
    const input = screen.getByTestId("kiosk-lock-pin-input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "9999" } });
    fireEvent.click(screen.getByTestId("kiosk-lock-submit"));
    await waitFor(() => expect(pinLoginFn).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByTestId("kiosk-lock-error")).toBeInTheDocument());
    expect(onUnlock).not.toHaveBeenCalled();
    expect(input.value).toBe("");
  });

  it("strips non-digit input", () => {
    render(<KioskLock memberId="m1" onUnlock={() => {}} pinLoginFn={async () => {}} />);
    const input = screen.getByTestId("kiosk-lock-pin-input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "1a2b3c" } });
    expect(input.value).toBe("123");
  });
});
