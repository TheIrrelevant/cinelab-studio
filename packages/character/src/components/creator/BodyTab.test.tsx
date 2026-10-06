/**
 * @file BodyTab.test.tsx
 * @description Plan 2.5 body tab wiring: every control calls its action with the labelled value -
 *   gender, ethnicity presets, cm/kg (Enter), body type and intensity, region sliders and reset;
 *   breast controls only on female bodies; controls stay disabled until the body is loaded.
 * @scope cinelab-studio
 * @depends ./BodyTab, ../../creator/creator-model
 */

import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { initialCreatorState } from "../../creator/creator-model";
import { BodyTab, type BodyTabActions } from "./BodyTab";

const actions = (): BodyTabActions => ({
  setGender: vi.fn(), applyEthnicity: vi.fn(), setSize: vi.fn(), setBodyType: vi.fn(), setRegion: vi.fn(), resetRegion: vi.fn(),
});
const state = () => ({ ...initialCreatorState(), size: { heightCm: 165.04, massKg: 55.01 } });

describe("BodyTab (plan 2.5)", () => {
  it("calls every action with the labelled value", async () => {
    const user = userEvent.setup();
    const a = actions();
    render(<BodyTab state={state()} measured={null} ready actions={a} />);
    await user.click(screen.getByRole("radio", { name: "Male" }));
    expect(a.setGender).toHaveBeenCalledWith(1);
    expect(screen.getByRole("radio", { name: "European" })).toHaveAttribute("aria-checked", "true");
    await user.click(screen.getByRole("radio", { name: "Latin" }));
    expect(a.applyEthnicity).toHaveBeenCalledWith("latin");
    await user.click(screen.getByRole("radio", { name: "Curvy" }));
    expect(a.setBodyType).toHaveBeenCalledWith({ id: "curvy", intensity: 1 });
    fireEvent.change(screen.getByLabelText("Type intensity"), { target: { value: "0.4" } });
    expect(a.setBodyType).toHaveBeenLastCalledWith({ id: "average", intensity: 0.4 });

    const height = screen.getByLabelText("Height (cm)");
    expect(height).toHaveValue("165.0");
    await user.clear(height);
    await user.type(height, "172{Enter}");
    expect(a.setSize).toHaveBeenCalledWith({ heightCm: 172, massKg: 55 });
  });

  it("drives region sliders and resets, with breast controls only for female bodies", () => {
    const a = actions();
    const female = state();
    const { rerender } = render(<BodyTab state={female} measured={null} ready actions={a} />);
    const waist = within(screen.getByTestId("region-waist"));
    fireEvent.change(waist.getByLabelText("Waist"), { target: { value: "0.6" } });
    expect(a.setRegion).toHaveBeenCalledWith(expect.objectContaining({ id: "torso/measure-waist-circ-decr-incr" }), 0.6);
    expect(screen.getByLabelText("Breast size")).toBeInTheDocument();

    const edited = { ...female, shape: { ...female.shape, modifiers: { "torso/measure-waist-circ-decr-incr": 0.6 } } };
    rerender(<BodyTab state={edited} measured={null} ready actions={a} />);
    fireEvent.click(waist.getByRole("button", { name: "Reset waist and hips" }));
    expect(a.resetRegion).toHaveBeenCalledWith(expect.objectContaining({ id: "waist" }));

    rerender(<BodyTab state={{ ...female, shape: { ...female.shape, gender: 1 } }} measured={null} ready actions={a} />);
    expect(screen.queryByLabelText("Breast size")).toBeNull();
    expect(screen.queryByTestId("region-chest")).toBeNull();
  });

  it("disables controls until the body is loaded", () => {
    render(<BodyTab state={initialCreatorState()} measured={null} ready={false} actions={actions()} />);
    expect(screen.getByRole("radio", { name: "Latin" })).toBeDisabled();
    expect(screen.getByLabelText("Height (cm)")).toBeDisabled();
    expect(screen.getByText("Loading body...")).toBeInTheDocument();
  });
});
