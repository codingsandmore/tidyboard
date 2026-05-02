/**
 * SmartImportReview tests — issue #87.
 *
 * Covers the acceptance criterion "Web tests for review/confirm/cancel"
 * by exercising the three branches the spec calls out:
 *
 *   1. Renders the review screen with editable fields when given a draft.
 *   2. Confirm sends the user-edited draft (NOT the original AI variant).
 *   3. Cancel triggers the cancel callback without persisting.
 *   4. AI off path: no badge when ai_provider is "disabled".
 *   5. Photo source path: shows the preview image.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import {
  SmartImportReview,
  type SmartImportDraft,
} from "./SmartImportReview";

function makeDraft(overrides: Partial<SmartImportDraft> = {}): SmartImportDraft {
  return {
    title: "Pasta Carbonara",
    description: "",
    tags: ["pasta", "italian"],
    categories: [],
    difficulty: "easy",
    source: "url",
    ...overrides,
  };
}

describe("SmartImportReview", () => {
  it("renders the review fields with the draft pre-filled", () => {
    render(
      <SmartImportReview
        initialDraft={makeDraft()}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByTestId("smart-import-review")).toBeTruthy();
    expect(
      (screen.getByLabelText("Recipe title") as HTMLInputElement).value,
    ).toBe("Pasta Carbonara");
    expect(
      (screen.getByLabelText("Recipe tags") as HTMLInputElement).value,
    ).toBe("pasta, italian");
  });

  it("uses the normalized variant when present", () => {
    render(
      <SmartImportReview
        initialDraft={makeDraft({ title: "raw scrape" })}
        normalized={makeDraft({
          title: "Pasta Carbonara",
          categories: ["dinner"],
        })}
        aiProvider="ollama"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(
      (screen.getByLabelText("Recipe title") as HTMLInputElement).value,
    ).toBe("Pasta Carbonara");
    expect(
      (screen.getByLabelText("Recipe categories") as HTMLInputElement).value,
    ).toBe("dinner");
    // AI badge surfaces the provider name
    expect(screen.getByTestId("smart-import-ai-badge").textContent).toContain(
      "ollama",
    );
  });

  it("does NOT show the AI badge when provider is disabled", () => {
    render(
      <SmartImportReview
        initialDraft={makeDraft()}
        aiProvider="disabled"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.queryByTestId("smart-import-ai-badge")).toBeNull();
  });

  it("Confirm sends the user-edited draft", async () => {
    const onConfirm = vi.fn();
    render(
      <SmartImportReview
        initialDraft={makeDraft()}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText("Recipe title"), {
      target: { value: "User Edited Title" },
    });
    fireEvent.change(screen.getByLabelText("Recipe categories"), {
      target: { value: "dinner, weeknight" },
    });
    fireEvent.click(screen.getByText("Confirm and save"));

    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
    const arg = onConfirm.mock.calls[0][0];
    expect(arg.title).toBe("User Edited Title");
    expect(arg.categories).toEqual(["dinner", "weeknight"]);
    expect(arg.tags).toEqual(["pasta", "italian"]); // un-edited stays
  });

  it("Cancel triggers the cancel callback without persisting", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <SmartImportReview
        initialDraft={makeDraft()}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    fireEvent.click(screen.getByText("Cancel"));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("disables Confirm when title is empty (required)", () => {
    render(
      <SmartImportReview
        initialDraft={makeDraft({ title: "" })}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    const confirm = screen.getByText("Confirm and save") as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
  });

  it("photo source: shows the preview image and 'from photo' tag", () => {
    render(
      <SmartImportReview
        initialDraft={makeDraft({
          source: "photo",
          title: "",
          image_url: "data:image/jpeg;base64,AAAA",
        })}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByTestId("smart-import-photo-preview")).toBeTruthy();
    expect(screen.getByText("from photo")).toBeTruthy();
  });

  it("renders the AI-error hint when aiError is set", () => {
    render(
      <SmartImportReview
        initialDraft={makeDraft()}
        aiError="connection refused"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByTestId("smart-import-ai-error")).toBeTruthy();
  });
});
