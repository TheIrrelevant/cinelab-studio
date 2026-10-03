/**
 * @file PreviewWindow.test.tsx
 * @description Verifies minimize/restore without losing the camera window controls.
 * @depends PreviewWindow.tsx
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { PreviewWindow } from "./PreviewWindow";

it("minimizes to a camera icon and restores the window", () => {
  render(<PreviewWindow><p>Camera image</p></PreviewWindow>);
  fireEvent.click(screen.getByRole("button", { name: "Minimize camera preview" }));
  expect(screen.queryByRole("region", { name: "Camera preview" })).toBeNull();
  const restore = screen.getByRole("button", { name: "Restore camera preview" });
  fireEvent.click(restore);
  expect(screen.getByRole("region", { name: "Camera preview" })).toBeInTheDocument();
  expect(screen.getByText("Camera image")).toBeInTheDocument();
});
