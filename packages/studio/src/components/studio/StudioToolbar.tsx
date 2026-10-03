/**
 * @file StudioToolbar.tsx
 * @description Bottom toolbar: asset tools, gizmo mode and delete, with enabled/active rules.
 * @scope cinelab-studio
 * @depends ToolIcon, studio-constants
 */

"use client";

import type { ToolId, TransformMode } from "../studio-constants";
import { ASSET_TOOLS, TRANSFORM_TOOLS, ToolIcon } from "./ToolIcon";

export function StudioToolbar({
  loading,
  canPose,
  hasTransformable,
  transformMode,
  modelPickerOpen,
  posePickerOpen,
  onTool,
}: {
  loading: boolean;
  canPose: boolean;
  hasTransformable: boolean;
  transformMode: TransformMode;
  modelPickerOpen: boolean;
  posePickerOpen: boolean;
  onTool: (tool: ToolId) => void;
}) {
  const renderToolButton = (tool: { id: ToolId; label: string }) => {
    const isTransform = tool.id === "move" || tool.id === "rotate";
    const enabled = !loading && (
      tool.id === "light" ||
      tool.id === "camera" ||
      tool.id === "model" ||
      (tool.id === "pose" && canPose) ||
      ((isTransform || tool.id === "delete") && hasTransformable));
    const active =
      (tool.id === "move" && transformMode === "translate") ||
      (tool.id === "rotate" && transformMode === "rotate") ||
      (tool.id === "model" && modelPickerOpen) ||
      (tool.id === "pose" && posePickerOpen);

    return (
      <button
        key={tool.id}
        type="button"
        disabled={!enabled}
        aria-pressed={isTransform || tool.id === "model" || tool.id === "pose" ? active : undefined}
        onClick={enabled ? () => onTool(tool.id) : undefined}
        title={enabled ? tool.label : `${tool.label} unavailable`}
        className={`group flex h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-2 transition sm:min-w-14 sm:flex-none sm:px-3 disabled:cursor-not-allowed disabled:opacity-35 ${
          active
            ? "bg-amber-300 text-neutral-950"
            : tool.id === "delete"
              ? "text-red-300 enabled:hover:bg-red-400/15 enabled:hover:text-red-200"
              : "text-white/55 enabled:hover:bg-white/10 enabled:hover:text-white"
        }`}
      >
        <ToolIcon tool={tool.id} />
        <span className="text-[10px] font-medium tracking-wide">{tool.label}</span>
      </button>
    );
  };

  return (
    <nav
      aria-label="Studio tools"
      className="absolute bottom-5 left-1/2 flex w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-0 rounded-2xl sm:w-auto sm:gap-1 border border-white/10 bg-[#141516]/90 p-1.5 shadow-2xl shadow-black/40 backdrop-blur-2xl"
    >
      {ASSET_TOOLS.map(renderToolButton)}
      <span aria-hidden="true" className="mx-1 h-8 w-px bg-white/10" />
      {TRANSFORM_TOOLS.map(renderToolButton)}
      {renderToolButton({ id: "delete", label: "Delete" })}
    </nav>
  );
}
