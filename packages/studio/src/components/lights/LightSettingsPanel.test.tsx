/**
 * @file LightSettingsPanel.test.tsx
 * @description Light settings panel: flash, softbox, power, colour presets and dimensions.
 * @scope cinelab-studio
 * @depends LightSettingsPanel, scene-storage
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import type { StudioLight } from "../../scene-storage";
import { LightSettingsPanel } from "../lights/LightSettingsPanel";

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

describe("LightSettingsPanel", () => {
  const light = {
    id: "light-1",
    position: [0, 0, 0] as [number, number, number],
    homePosition: [0, 0, 0] as [number, number, number],
    rotation: [0, 0, 0] as [number, number, number],
    headRotation: [0, 0, 0] as [number, number, number],
    height: 2.4,
    lightType: "bare" as const,
    modifier: "none" as const,
    softboxWidth: 90,
    softboxHeight: 60,
    intensity: 95,
    spread: 0.62,
    color: "#fff0d2",
    colorTemperature: null,
    role: null,
  };

  it("locks flash to daylight, preserves softbox settings, and restores the bare color", () => {
    function Settings() {
      const [value, setValue] = useState<StudioLight>({ ...light, modifier: "softbox", color: "#ffb36b" });
      return <LightSettingsPanel light={value} onChange={(patch) => setValue((current) => ({ ...current, ...patch }))} onClose={vi.fn()} onResetTransform={vi.fn()} />;
    }
    render(<Settings />);
    fireEvent.click(screen.getByRole("button", { name: "Flash" }));
    expect(screen.getByRole("button", { name: "Flash" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "With softbox" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("textbox", { name: "Light color hex code" })).toHaveValue("#FFEEE3");
    expect(screen.getByLabelText("Light color picker")).toBeDisabled();
    for (const [channel, value] of [["R", 255], ["G", 238], ["B", 227]] as const) {
      expect(screen.getByLabelText(`${channel} color channel`)).toBeDisabled();
      expect(screen.getByLabelText(`${channel} color channel`)).toHaveValue(value);
    }
    expect(screen.getByRole("button", { name: "Set light color #ef5350" })).toBeDisabled();
    fireEvent.change(screen.getByRole("textbox", { name: "Light color hex code" }), { target: { value: "#ff0000" } });
    expect(screen.getByRole("textbox", { name: "Light color hex code" })).toHaveValue("#FFEEE3");
    fireEvent.click(screen.getByRole("button", { name: "Without softbox" }));
    expect(screen.queryByRole("slider", { name: "Softbox width" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Bare Light" }));
    expect(screen.getByLabelText("Light color picker")).toBeEnabled();
    expect(screen.getByRole("textbox", { name: "Light color hex code" })).toHaveValue("#FFB36B");
    fireEvent.click(screen.getByRole("button", { name: "Set light color #ef5350" }));
    expect(screen.getByRole("textbox", { name: "Light color hex code" })).toHaveValue("#EF5350");
    fireEvent.click(screen.getByRole("button", { name: "With softbox" }));
    expect(screen.getByRole("slider", { name: "Softbox width" })).toHaveValue("90");
  });

  it("updates the modifier and light power", () => {
    const onChange = vi.fn();
    render(
      <LightSettingsPanel
        light={light}
        onChange={onChange}
        onClose={vi.fn()}
        onResetTransform={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "With softbox" }));
    expect(onChange).toHaveBeenCalledWith({ modifier: "softbox" });

    fireEvent.change(screen.getByRole("slider", { name: "Light power" }), {
      target: { value: "140" },
    });
    expect(onChange).toHaveBeenCalledWith({ intensity: 140 });

    fireEvent.change(screen.getByRole("spinbutton", { name: "Head rotation X degrees" }), {
      target: { value: "35" },
    });
    expect(onChange).toHaveBeenCalledWith({ headRotation: [35, 0, 0] });

    fireEvent.change(screen.getByRole("spinbutton", { name: "Light stand height" }), {
      target: { value: "2.8" },
    });
    expect(onChange).toHaveBeenCalledWith({ height: 2.8 });

    fireEvent.change(screen.getByRole("spinbutton", { name: "Light stand height" }), {
      target: { value: "10" },
    });
    expect(onChange).toHaveBeenCalledWith({ height: 10 });
  });

  it("updates preset colors and closes", () => {
    const onChange = vi.fn();
    const onClose = vi.fn();
    const onResetTransform = vi.fn();
    render(
      <LightSettingsPanel
        light={light}
        onChange={onChange}
        onClose={onClose}
        onResetTransform={onResetTransform}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Default pose/ }));
    expect(onResetTransform).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole("button", { name: "Set light color #d8e8ff" }));
    expect(onChange).toHaveBeenCalledWith({ color: "#d8e8ff", colorTemperature: null });

    fireEvent.change(screen.getByRole("textbox", { name: "Light color hex code" }), {
      target: { value: "#12AB34" },
    });
    expect(onChange).toHaveBeenCalledWith({ color: "#12ab34", colorTemperature: null });

    fireEvent.change(screen.getByRole("spinbutton", { name: "R color channel" }), {
      target: { value: "128" },
    });
    expect(onChange).toHaveBeenCalledWith({ color: "#80f0d2", colorTemperature: null });

    fireEvent.click(screen.getByRole("button", { name: "Close light settings" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("adjusts softbox width and height without fixed presets", () => {
    const onChange = vi.fn();
    render(
      <LightSettingsPanel
        light={{ ...light, modifier: "softbox" }}
        onChange={onChange}
        onClose={vi.fn()}
        onResetTransform={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByRole("slider", { name: "Softbox width" }), {
      target: { value: "125" },
    });
    expect(onChange).toHaveBeenCalledWith({ softboxWidth: 125 });

    fireEvent.change(screen.getByRole("spinbutton", { name: "Softbox height centimeters" }), {
      target: { value: "75" },
    });
    expect(onChange).toHaveBeenCalledWith({ softboxHeight: 75 });
  });
});
