/**
 * @file ToolIcon.tsx
 * @description Toolbar tool definitions and their line icons.
 * @scope cinelab-studio
 * @depends react, studio-constants
 */

"use client";

import type { ReactNode } from "react";
import type { ToolId } from "../studio-constants";

export const ASSET_TOOLS: Array<{ id: ToolId; label: string }> = [
  { id: "light", label: "Light" },
  { id: "camera", label: "Camera" },
  { id: "model", label: "Model" },
  { id: "pose", label: "Pose" },
  { id: "object", label: "Object" },
];

export const TRANSFORM_TOOLS: Array<{ id: ToolId; label: string }> = [
  { id: "move", label: "Move" },
  { id: "rotate", label: "Rotate" },
];

export function ToolIcon({ tool }: { tool: ToolId }) {
  const paths: Record<ToolId, ReactNode> = {
    light: <path d="M9 18h6M10 22h4M8 14a6 6 0 1 1 8 0c-1.2 1-1.6 1.8-1.7 2H9.7c-.1-.2-.5-1-1.7-2Z" />,
    camera: (
      <>
        <path d="M4 8h3l1.5-2h7L17 8h3v10H4Z" />
        <circle cx="12" cy="13" r="3" />
      </>
    ),
    model: (
      <>
        <circle cx="12" cy="6" r="3" />
        <path d="M8 21v-5l-2-5h12l-2 5v5M9 11l3 4 3-4" />
      </>
    ),
    pose: (
      <>
        <circle cx="12" cy="5" r="2.5" />
        <path d="m12 8 1 5 4 3M12 10l-4 3-3-2M13 13l-3 7M13 13l4 7" />
      </>
    ),
    object: (
      <>
        <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9Z" />
        <path d="m4 7.5 8 4.5 8-4.5M12 12v9" />
      </>
    ),
    move: <path d="M12 3v18M3 12h18M12 3 9 6M12 3l3 3M21 12l-3-3M21 12l-3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3" />,
    rotate: <path d="M20 11a8 8 0 1 0-2.35 5.65M20 5v6h-6" />,
    delete: <path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" />,
  };

  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[tool]}
    </svg>
  );
}
