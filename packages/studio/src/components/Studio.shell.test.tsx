/**
 * @file Studio.shell.test.tsx
 * @description Studio shell: toolbar availability, adding and deleting assets, persistence and storage failures.
 * @scope cinelab-studio
 * @depends Studio
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Studio } from "./Studio";

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

describe("Studio", () => {
  it("opens directly into the studio with the complete toolbar", async () => {
    render(<Studio />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Light" })).toBeEnabled());

    expect(screen.getByTestId("studio-canvas")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Studio tools" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Light" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Camera" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Model" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Pose" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Object" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Move" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Rotate" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Delete" })).toBeDisabled();
  });

  it("deletes only the selected light and keeps it deleted after reload", async () => {
    const view = render(<Studio />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Light" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Camera" }));
    fireEvent.click(screen.getByRole("button", { name: "Light" }));
    fireEvent.click(screen.getByRole("button", { name: "Light" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByLabelText("Scene asset count")).toHaveTextContent("1 light · 1 camera");
    expect(screen.getByRole("button", { name: "Delete" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Move" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Rotate" })).toBeDisabled();
    await waitFor(() => {
      const saved = JSON.parse(window.localStorage.getItem("cinelab-studio-scene-v1")!);
      expect(saved.lights.map((light: { id: string }) => light.id)).toEqual(["light-0"]);
      expect(saved.cameras).toHaveLength(1);
    });
    view.unmount();
    render(<Studio />);
    await waitFor(() => expect(screen.getByLabelText("Scene asset count")).toHaveTextContent("1 light · 1 camera"));
  });

  it("deletes a camera and closes its preview while preserving the light", async () => {
    render(<Studio />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Light" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Light" }));
    fireEvent.click(screen.getByRole("button", { name: "Camera" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.queryByRole("region", { name: "Camera preview" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Scene asset count")).toHaveTextContent("1 light · 0 cameras");
    expect(screen.getByRole("button", { name: "Delete" })).toBeDisabled();
    await waitFor(() => {
      const saved = JSON.parse(window.localStorage.getItem("cinelab-studio-scene-v1")!);
      expect(saved.cameras).toEqual([]);
      expect(saved.lights).toHaveLength(1);
    });
  });

  it("adds a light from the toolbar", async () => {
    render(<Studio />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Light" })).toBeEnabled());

    expect(screen.getByLabelText("Scene asset count")).toHaveTextContent("0 lights · 0 cameras");
    fireEvent.click(screen.getByRole("button", { name: "Light" }));
    expect(screen.getByLabelText("Scene asset count")).toHaveTextContent("1 light · 0 cameras");
    expect(screen.getByRole("button", { name: "Move" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Move" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Rotate" }));
    expect(screen.getByRole("button", { name: "Rotate" })).toHaveAttribute("aria-pressed", "true");
  });

  it("adds a professional camera and opens its live preview", async () => {
    render(<Studio />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Light" })).toBeEnabled());

    fireEvent.click(screen.getByRole("button", { name: "Camera" }));
    expect(screen.getByRole("region", { name: "Camera preview" })).toBeInTheDocument();
    expect(screen.getByText("ISO 400")).toBeInTheDocument();
    expect(screen.getByText("50 mm")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Move" })).toBeEnabled();
  });

  it("restores studio assets after a page remount", async () => {
    const firstRender = render(<Studio />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Light" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Light" }));
    fireEvent.click(screen.getByRole("button", { name: "Camera" }));

    await waitFor(() =>
      expect(window.localStorage.getItem("cinelab-studio-scene-v1")).toContain("camera-0"),
    );
    firstRender.unmount();
    render(<Studio />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Light" })).toBeEnabled());

    await waitFor(() =>
      expect(screen.getByLabelText("Scene asset count")).toHaveTextContent(
        "1 light · 1 camera",
      ),
    );
  });
  it("blocks asset creation before saved data has loaded", async () => {
    render(<Studio />);
    expect(screen.getByRole("button", { name: "Camera" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Camera" }));
    expect(screen.getByLabelText("Scene asset count")).toHaveTextContent("0 lights · 0 cameras");
    await waitFor(() => expect(screen.getByRole("button", { name: "Camera" })).toBeEnabled());
  });

  it("preserves malformed storage and tells the user edits are temporary", async () => {
    window.localStorage.setItem("cinelab-studio-scene-v1", "{broken");
    render(<Studio />);
    expect(await screen.findByRole("alert")).toHaveTextContent("existing save is preserved");
    fireEvent.click(screen.getByRole("button", { name: "Camera" }));
    expect(screen.getByLabelText("Scene asset count")).toHaveTextContent("0 lights · 1 camera");
    expect(window.localStorage.getItem("cinelab-studio-scene-v1")).toBe("{broken");
  });

  it("shows a notice when saving fails and preserves the last save", async () => {
    render(<Studio />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Camera" })).toBeEnabled());
    const prior = window.localStorage.getItem("cinelab-studio-scene-v1");
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("Full", "QuotaExceededError"); });
    fireEvent.click(screen.getByRole("button", { name: "Camera" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Scene could not be saved");
    expect(window.localStorage.getItem("cinelab-studio-scene-v1")).toBe(prior);
  });

  it("allows a temporary session when storage access is denied", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new DOMException("Denied", "SecurityError"); });
    render(<Studio />);
    expect(await screen.findByRole("alert")).toHaveTextContent("this session will not be saved");
    fireEvent.click(screen.getByRole("button", { name: "Light" }));
    expect(screen.getByLabelText("Scene asset count")).toHaveTextContent("1 light · 0 cameras");
  });

});
