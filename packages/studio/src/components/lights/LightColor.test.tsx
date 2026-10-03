/**
 * @file LightColor.test.tsx
 * @description Light roles, colour temperature and the backdrop paper panel.
 * @scope cinelab-studio
 * @depends BackdropSettingsPanel, LightSettingsPanel, light-presets, scene-storage
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { StudioLight } from "../../scene-storage";
import { LightSettingsPanel } from "../lights/LightSettingsPanel";
import { BackdropSettingsPanel } from "../BackdropSettingsPanel";
import { kelvinToHex } from "../../light-presets";

vi.mock("@react-three/fiber", () => ({
  Canvas: () => <div data-testid="studio-canvas" />,
  useFrame: vi.fn(),
  useThree: vi.fn(),
}));

vi.mock("@react-three/drei", () => ({
  Html: () => null,
  OrbitControls: () => null,
  RoundedBox: () => null,
  TransformControls: () => null,
}));

afterEach(() => vi.restoreAllMocks());

describe("Light roles and colour temperature", () => {
  const base: StudioLight = {
    id: "light-1",
    position: [0, 0, 0],
    homePosition: [0, 0, 0],
    rotation: [0, 0, 0],
    headRotation: [0, 0, 0],
    height: 2.4,
    lightType: "bare",
    modifier: "none",
    softboxWidth: 90,
    softboxHeight: 60,
    intensity: 95,
    spread: 0.62,
    color: "#fff0d2",
    colorTemperature: null,
    role: null,
  };

  it("sets colour and kelvin together from the temperature slider", () => {
    const onChange = vi.fn();
    render(<LightSettingsPanel light={base} onChange={onChange} onClose={vi.fn()} onResetTransform={vi.fn()} />);
    expect(screen.getByText("Custom")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Colour temperature"), { target: { value: "3200" } });
    expect(onChange).toHaveBeenCalledWith({ color: kelvinToHex(3200), colorTemperature: 3200 });
  });

  it("shows the role in the title and applies a role", () => {
    const onApplyRole = vi.fn();
    render(
      <LightSettingsPanel
        light={{ ...base, role: "fill", colorTemperature: 4300 }}
        onChange={vi.fn()}
        onClose={vi.fn()}
        onResetTransform={vi.fn()}
        onApplyRole={onApplyRole}
      />,
    );
    expect(screen.getByRole("heading", { name: "Fill light" })).toBeInTheDocument();
    expect(screen.getByText("4300 K")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fill" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Rim" }));
    expect(onApplyRole).toHaveBeenCalledWith("rim");
  });

  it("disables the temperature slider for flash", () => {
    render(<LightSettingsPanel light={{ ...base, lightType: "flash" }} onChange={vi.fn()} onClose={vi.fn()} onResetTransform={vi.fn()} />);
    expect(screen.getByLabelText("Colour temperature")).toBeDisabled();
    expect(screen.getByText("5600 K")).toBeInTheDocument();
  });

});

describe("BackdropSettingsPanel", () => {
  it("marks the current paper colour and changes it", () => {
    const onChange = vi.fn();
    render(<BackdropSettingsPanel backdrop={{ color: "gray" }} onChange={onChange} onClose={vi.fn()} />);
    expect(screen.getByRole("button", { name: /gray/i })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: /white/i }));
    expect(onChange).toHaveBeenCalledWith({ color: "white" });
  });
});
