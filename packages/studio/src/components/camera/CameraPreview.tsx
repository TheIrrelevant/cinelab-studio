/**
 * @file CameraPreview.tsx
 * @description Live camera view window with exposure, focus and zoom controls.
 * @scope cinelab-studio
 * @depends PreviewWindow, camera-lenses, camera-rig, camera-types
 */

"use client";

import { CAMERA_LENSES } from "../../camera-lenses";
import { SHUTTER_SPEEDS } from "../../camera-rig";
import { PreviewWindow } from "../PreviewWindow";
import { FILTERS, ISO_VALUES, type CameraFilterId, type CameraPatch, type StudioCameraAsset } from "./camera-types";

export function CameraPreview({
  camera,
  onChange,
  canvasRef,
}: {
  camera: StudioCameraAsset;
  onChange: (patch: CameraPatch) => void;
  canvasRef?: (canvas: HTMLCanvasElement | null) => void;
}) {
  if (!camera.previewVisible) return null;
  const lens = CAMERA_LENSES[camera.lens];
  const filter = FILTERS.find((item) => item.id === camera.filter) ?? FILTERS[0];
  const isZoomLens = lens.focalMin !== lens.focalMax;
  const shutterSpeed = SHUTTER_SPEEDS[camera.shutterIndex] ?? "1/125";
  const isoIndex = Math.max(0, ISO_VALUES.indexOf(camera.iso));
  const filterCss: Record<CameraFilterId, string> = {
    neutral: "none",
    warm: "sepia(0.35) saturate(1.2)",
    cool: "hue-rotate(175deg) saturate(0.85)",
    mono: "grayscale(1)",
    cinematic: "contrast(1.12) saturate(0.78) hue-rotate(145deg)",
  };

  return (
    <PreviewWindow>
      <div className="relative aspect-video overflow-hidden bg-neutral-700" style={{ boxShadow: `inset 0 0 90px ${filter.color}55` }}>
        <canvas
          ref={canvasRef}
          width="480"
          height="270"
          aria-label="Live camera feed"
          className="absolute inset-0 h-full w-full object-cover"
          style={{ filter: filterCss[camera.filter] }}
        />
        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-25">
          {Array.from({ length: 9 }).map((_, index) => (
            <span key={index} className="border-b border-r border-white/40" />
          ))}
        </div>
        <div className="absolute left-3 top-3 flex items-center gap-2 text-[10px] font-semibold text-white/85">
          <span className="h-2 w-2 rounded-full bg-red-500" /> LIVE
        </div>
        <div className="absolute right-3 top-3 text-[10px] font-medium text-white/70">
          FOCUS {`${camera.focusDistance.toFixed(1)} m`}
        </div>
        <div className="absolute left-1/2 top-1/2 h-12 w-16 -translate-x-1/2 -translate-y-1/2 border-l border-r border-white/70" />
        <div className="absolute inset-x-0 bottom-0 grid grid-cols-4 bg-black/65 px-4 py-2 text-center text-[10px] text-white/55">
          <strong className="text-white">{shutterSpeed}</strong>
          <strong className="text-white">F{camera.aperture.toFixed(1)}</strong>
          <strong className="text-white">ISO {camera.iso}</strong>
          <strong className="text-white">{camera.zoomMm} mm</strong>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 p-3">
        <label className="text-[10px] text-white/45">
          F · {camera.aperture.toFixed(1)}
          <input aria-label="F" type="range" min={lens.maxAperture} max="22" step="0.1" value={camera.aperture} onChange={(event) => onChange({ aperture: Number(event.target.value) })} className="mt-1 w-full accent-amber-300" />
        </label>
        <label className="text-[10px] text-white/45">
          ISO · {camera.iso}
          <input aria-label="ISO" type="range" min="0" max={ISO_VALUES.length - 1} step="1" value={isoIndex} onChange={(event) => onChange({ iso: ISO_VALUES[Number(event.target.value)] })} className="mt-1 w-full accent-amber-300" />
        </label>
        <label className="text-[10px] text-white/45">
          Shutter Speed · {shutterSpeed}
          <input aria-label="Shutter Speed" type="range" min="0" max={SHUTTER_SPEEDS.length - 1} step="1" value={camera.shutterIndex} onChange={(event) => onChange({ shutterIndex: Number(event.target.value) })} className="mt-1 w-full accent-amber-300" />
        </label>
        <label className="text-[10px] text-white/45">
          Focus Distance · {`${camera.focusDistance.toFixed(1)} m`}
          <input aria-label="Focus Distance" type="range" min={lens.minFocus} max="20" step="0.1" value={camera.focusDistance} onChange={(event) => onChange({ focusDistance: Number(event.target.value) })} className="mt-1 w-full accent-amber-300" />
        </label>
        <label className={`text-[10px] ${isZoomLens ? "text-white/45" : "text-white/20"}`}>
          Zoom · {camera.zoomMm} mm
          <input aria-label="Zoom" type="range" min={lens.focalMin} max={lens.focalMax} step="1" value={camera.zoomMm} disabled={!isZoomLens} onChange={(event) => onChange({ zoomMm: Number(event.target.value) })} className="mt-1 w-full accent-amber-300 disabled:opacity-30" />
        </label>
      </div>
    </PreviewWindow>
  );
}
