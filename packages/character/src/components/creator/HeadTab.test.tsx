/**
 * @file HeadTab.test.tsx
 * @description Plan 2.6 head tab wiring with a small catalogue: face-shape presets (and Natural),
 *   group sliders (bipolar with end words, unipolar from 0), per-group reset, disabled facial hair,
 *   loading state.
 * @scope cinelab-studio
 * @depends ./HeadTab
 */

import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_SHAPE } from "@cinelab/human/makehuman/shape-model";
import type { Modifier } from "@cinelab/human/makehuman/modifier-catalogue";
import { HeadTab, type HeadTabActions } from "./HeadTab";

const catalogue: Modifier[] = [
  { id: "nose/nose-hump-decr-incr", group: "nose", section: "head", label: "Hump", kind: "bipolar", sided: false, negative: { unsided: "nose/nose-hump-decr" }, positive: { unsided: "nose/nose-hump-incr" }, ends: ["decr", "incr"] },
  { id: "head/head-oval", group: "head", section: "head", label: "Oval", kind: "unipolar", sided: false, negative: {}, positive: { unsided: "head/head-oval" }, ends: null },
];
const actions = (): HeadTabActions => ({ setFaceShape: vi.fn(), setRegion: vi.fn(), resetRegion: vi.fn() });

describe("HeadTab (plan 2.6)", () => {
  it("applies face shapes and drives group sliders and resets", () => {
    const a = actions();
    const { rerender } = render(<HeadTab shape={DEFAULT_SHAPE} catalogue={catalogue} actions={a} />);
    expect(screen.getByRole("radio", { name: "Natural" })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("radio", { name: "heart" }));
    expect(a.setFaceShape).toHaveBeenCalledWith("heart");

    const nose = within(screen.getByTestId("region-head-nose"));
    const hump = nose.getByLabelText("Hump");
    expect(hump).toHaveAttribute("min", "-1");
    expect(nose.getByText("decr")).toBeInTheDocument();
    fireEvent.change(hump, { target: { value: "0.5" } });
    expect(a.setRegion).toHaveBeenCalledWith(expect.objectContaining({ id: "nose/nose-hump-decr-incr" }), 0.5);
    expect(within(screen.getByTestId("region-head-head")).getByLabelText("Oval shape")).toHaveAttribute("min", "0");

    rerender(<HeadTab shape={{ ...DEFAULT_SHAPE, modifiers: { "head/head-oval": 0.7, "nose/nose-hump-decr-incr": 0.5 } }} catalogue={catalogue} actions={a} />);
    expect(screen.getByRole("radio", { name: "oval" })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(nose.getByRole("button", { name: "Reset nose" }));
    expect(a.resetRegion).toHaveBeenCalledWith(expect.objectContaining({ id: "head-nose" }));
  });

  it("shows facial hair as disabled with None selected (plan 2.7b)", () => {
    render(<HeadTab shape={DEFAULT_SHAPE} catalogue={catalogue} actions={actions()} />);
    const group = within(screen.getByRole("radiogroup", { name: "Facial hair" }));
    for (const name of ["None", "Beard", "Moustache"]) expect(group.getByRole("radio", { name })).toBeDisabled();
    expect(group.getByRole("radio", { name: "None" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText("Coming later.")).toBeInTheDocument();
  });

  it("waits for the catalogue", () => {
    render(<HeadTab shape={DEFAULT_SHAPE} catalogue={null} actions={actions()} />);
    expect(screen.getByText("Loading head controls...")).toBeInTheDocument();
  });
});
