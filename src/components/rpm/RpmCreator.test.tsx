/**
 * @file RpmCreator.test.tsx
 * @description Ensures the retired avatar service is explained and never contacted, even with legacy configuration.
 * @depends RpmCreator.tsx, https://readyplayer.me/
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { RpmCreator } from "./RpmCreator";

afterEach(() => vi.unstubAllEnvs());

describe("discontinued RPM creator", () => {
  it.each([undefined, "kraftreich"])("does not embed the retired service with configuration %s", (subdomain) => {
    vi.stubEnv("NEXT_PUBLIC_RPM_SUBDOMAIN", subdomain);
    const { container } = render(<RpmCreator onAvatarExported={vi.fn()} />);
    expect(screen.getByRole("region", { name: "Avatar creator unavailable" })).toBeInTheDocument();
    expect(screen.getByText(/January 31, 2026/)).toBeInTheDocument();
    expect(container.querySelector("iframe")).toBeNull();
    expect(screen.getByRole("link", { name: "Open character library" })).toHaveAttribute("href", "/characters");
  });

  it("ignores legacy frame events and never invokes export or user callbacks", () => {
    const onAvatarExported = vi.fn();
    const onUserSet = vi.fn();
    render(<RpmCreator onAvatarExported={onAvatarExported} onUserSet={onUserSet} />);
    for (const eventType of ["v1.frame.ready", "v1.avatar.exported", "v1.user.set"]) {
      window.dispatchEvent(new MessageEvent("message", {
        origin: "https://kraftreich.readyplayer.me",
        data: { eventType, data: { url: "https://kraftreich.readyplayer.me/a.glb", id: "id" } },
      }));
    }
    expect(onAvatarExported).not.toHaveBeenCalled();
    expect(onUserSet).not.toHaveBeenCalled();
  });
});
