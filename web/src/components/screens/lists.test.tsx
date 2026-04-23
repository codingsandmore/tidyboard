import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ListsIndex, ListDetail } from "./lists";
import { TBD } from "@/lib/data";

describe("ListsIndex", () => {
  it("renders without crashing", () => {
    render(<ListsIndex />);
  });

  it("shows Lists heading", () => {
    render(<ListsIndex />);
    expect(screen.getByText("Lists")).toBeTruthy();
  });

  it("shows New list button", () => {
    render(<ListsIndex />);
    expect(screen.getByText("+ New list")).toBeTruthy();
  });

  it("renders all list titles from sample data", () => {
    render(<ListsIndex />);
    for (const list of TBD.lists) {
      expect(screen.getByText(list.title)).toBeTruthy();
    }
  });

  it("renders category badges", () => {
    render(<ListsIndex />);
    // At least one category label visible
    expect(screen.getByText("Packing")).toBeTruthy();
    expect(screen.getByText("Chores")).toBeTruthy();
  });

  it("renders list emojis", () => {
    render(<ListsIndex />);
    for (const list of TBD.lists) {
      expect(screen.getByText(list.emoji)).toBeTruthy();
    }
  });
});

describe("ListDetail", () => {
  const list = TBD.lists[0]; // Packing for Weekend Trip

  it("renders without crashing", () => {
    render(<ListDetail list={list} />);
  });

  it("shows list title", () => {
    render(<ListDetail list={list} />);
    expect(screen.getByText(list.title)).toBeTruthy();
  });

  it("shows list items", () => {
    render(<ListDetail list={list} />);
    // Find at least the first item text
    expect(screen.getByText("Pack swimsuits & towels")).toBeTruthy();
  });

  it("toggles an item done/undone", () => {
    render(<ListDetail list={list} />);
    // Find the undone item row and click it
    const item = screen.getByText("Pack Jackson's soccer ball");
    // Walk up to the clickable container
    const row = item.closest("div[style*='cursor: pointer']") ?? item.parentElement;
    expect(row).toBeTruthy();
    fireEvent.click(row!);
    // After toggle, item should still be in DOM
    expect(screen.getByText("Pack Jackson's soccer ball")).toBeTruthy();
  });

  it("adds a new item via input", () => {
    render(<ListDetail list={list} />);
    const input = screen.getByPlaceholderText("Add item…");
    fireEvent.change(input, { target: { value: "New test item" } });
    // Press Enter to add
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });
    expect(screen.getByText("New test item")).toBeTruthy();
  });

  it("renders with a chores list", () => {
    render(<ListDetail list={TBD.lists[1]} />);
    expect(screen.getByText("Saturday Chores")).toBeTruthy();
  });

  it("renders with an errands list", () => {
    render(<ListDetail list={TBD.lists[2]} />);
    expect(screen.getByText("Weekly Errands")).toBeTruthy();
  });
});
