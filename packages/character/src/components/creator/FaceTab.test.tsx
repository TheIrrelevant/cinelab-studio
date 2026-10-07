/**
 * @file FaceTab.test.tsx
 * @description Plan 3.1 face tab wiring: one slider per facial action in five groups, slider changes,
 *   per-group and whole-face reset, disabled until the body is loaded.
 * @scope cinelab-studio
 * @depends ./FaceTab
 */

import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FaceTab, type FaceTabActions } from "./FaceTab";

const actions = (): FaceTabActions => ({ setFaceUnit: vi.fn(), resetFaceUnits: vi.fn() });

describe("FaceTab (plan 3.1)", () => {
  it("drives every facial action and resets groups and the face", () => {
    const a = actions();
    render(<FaceTab expression={{ jawOpen: 0.4 }} ready actions={a} />);
    expect(screen.getAllByRole("slider")).toHaveLength(51);
    const jaw = within(screen.getByTestId("face-jaw"));
    expect(jaw.getByLabelText("Jaw: Open")).toHaveValue("0.4");
    expect(jaw.getByText("edited")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Mouth: Smile left"), { target: { value: "0.7" } });
    expect(a.setFaceUnit).toHaveBeenCalledWith("mouthSmileLeft", 0.7);
    fireEvent.click(jaw.getByRole("button", { name: "Reset jaw" }));
    expect(a.resetFaceUnits).toHaveBeenCalledWith(["jawOpen", "jawForward", "jawLeft", "jawRight", "mouthClose"]);
    expect(within(screen.getByTestId("face-brows")).getByRole("button", { name: "Reset brows" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Reset face" }));
    expect(a.resetFaceUnits).toHaveBeenLastCalledWith(expect.arrayContaining(["eyeBlinkLeft", "jawOpen"]));
  });

  it("waits for the body", () => {
    render(<FaceTab expression={{}} ready={false} actions={actions()} />);
    expect(screen.getByLabelText("Eyes: Blink left")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Reset face" })).toBeDisabled();
  });
});
