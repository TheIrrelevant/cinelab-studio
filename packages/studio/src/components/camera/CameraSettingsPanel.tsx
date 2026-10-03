/**
 * @file CameraSettingsPanel.tsx
 * @description Camera settings panel: framing presets, tripod height, body, lens, angle, filter and preview toggle.
 * @scope cinelab-studio
 * @depends panel-styles, camera-rig, camera-lenses, framing, camera-types
 */

"use client";

import { CAMERA_LENSES, type CameraLensId } from "../../camera-lenses";
import { CAMERA_BODIES, type CameraBodyId } from "../../camera-rig";
import { FRAMINGS, type FramingId } from "../../framing";
import { RIGHT_PANEL_CLASS } from "../panel-styles";
import { FILTERS, HEAD_AXES, type CameraPatch, type StudioCameraAsset } from "./camera-types";

export function CameraSettingsPanel({
  camera,
  onChange,
  onClose,
  onReset,
  onApplyFraming,
}: {
  camera: StudioCameraAsset;
  onChange: (patch: CameraPatch) => void;
  onClose: () => void;
  onReset: () => void;
  onApplyFraming?: (framing: FramingId) => void;
}) {
  const setHeadAxis = (index: number, value: number) => {
    const rotation: [number, number, number] = [...camera.headRotation];
    rotation[index] = Math.max(-180, Math.min(180, value));
    onChange({ headRotation: rotation });
  };

  const selectLens = (lensId: CameraLensId) => {
    const lens = CAMERA_LENSES[lensId];
    onChange({
      lens: lensId,
      zoomMm: Math.max(lens.focalMin, Math.min(lens.focalMax, camera.zoomMm)),
      aperture: Math.max(lens.maxAperture, camera.aperture),
      focusDistance: Math.max(lens.minFocus, camera.focusDistance),
    });
  };

  return (
    <aside className={RIGHT_PANEL_CLASS}>
      <div className="mb-5 flex items-center justify-between">
        <div><p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">Selected camera</p><h2 className="mt-1 text-sm font-medium">Camera settings</h2></div>
        <button type="button" aria-label="Close camera settings" onClick={onClose} className="h-8 w-8 rounded-full text-white/50 hover:bg-white/10 hover:text-white">×</button>
      </div>
      <div className="space-y-5">
        {onApplyFraming ? (
          <fieldset>
            <legend className="mb-2 text-xs text-white/55">Framing</legend>
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-black/25 p-1">
              {(Object.keys(FRAMINGS) as FramingId[]).map((framing) => (
                <button
                  key={framing}
                  type="button"
                  aria-pressed={camera.framing === framing}
                  onClick={() => onApplyFraming(framing)}
                  className={`rounded-lg px-1.5 py-2 text-[11px] font-medium transition ${
                    camera.framing === framing ? "bg-white text-neutral-950" : "text-white/45 hover:text-white"
                  }`}
                >
                  {FRAMINGS[framing].label}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[10px] text-white/35">Moves the camera in front of the subject and sets lens, zoom and focus.</p>
          </fieldset>
        ) : null}
        <button type="button" onClick={onReset} className="flex w-full items-center justify-between rounded-xl border border-white/10 px-3 py-2.5 text-left text-xs text-white/65 hover:border-amber-300/40"><span><strong className="block text-white">Default pose</strong><small className="text-white/35">Reset rig and camera angle</small></span><span>↻</span></button>
        <label className="block text-xs text-white/55">Tripod height
          <div className="mt-2 flex items-center rounded-xl border border-white/10 bg-black/25 px-3"><input aria-label="Camera tripod height" type="number" min="0.8" max="3" step="0.05" value={camera.height} onChange={(event) => onChange({ height: Math.max(0.8, Math.min(3, Number(event.target.value) || 0.8)) })} className="h-10 w-full bg-transparent text-white outline-none" /><span className="text-white/35">m</span></div>
        </label>
        <label className="block text-xs text-white/55">Camera body
          <select aria-label="Camera body model" value={camera.body} onChange={(event) => onChange({ body: event.target.value as CameraBodyId })} className="mt-2 h-10 w-full rounded-xl border border-white/10 bg-[#0f1011] px-3 text-xs text-white outline-none">
            {Object.entries(CAMERA_BODIES).map(([id, model]) => <option key={id} value={id}>{model.label}</option>)}
          </select>
        </label>
        <label className="block text-xs text-white/55">Lens
          <select aria-label="Camera lens model" value={camera.lens} onChange={(event) => selectLens(event.target.value as CameraLensId)} className="mt-2 h-10 w-full rounded-xl border border-white/10 bg-[#0f1011] px-3 text-xs text-white outline-none">
            {Object.entries(CAMERA_LENSES).map(([id, model]) => <option key={id} value={id}>{model.label}</option>)}
          </select>
        </label>
        <fieldset><legend className="mb-3 text-xs text-white/55">Camera angle</legend><div className="space-y-3">
          {HEAD_AXES.map((axis, index) => <label key={axis} className="grid grid-cols-[18px_1fr_58px] items-center gap-2"><span className="text-xs font-semibold text-white/40">{axis}</span><input aria-label={`Camera angle ${axis}`} type="range" min="-180" max="180" value={camera.headRotation[index]} onChange={(event) => setHeadAxis(index, Number(event.target.value))} className="w-full accent-amber-300" /><span className="flex items-center rounded-lg bg-black/25 px-2 py-1"><input aria-label={`Camera angle ${axis} degrees`} type="number" min="-180" max="180" value={camera.headRotation[index]} onChange={(event) => setHeadAxis(index, Number(event.target.value))} className="w-8 bg-transparent text-right text-xs outline-none" /><span className="text-white/35">°</span></span></label>)}
        </div></fieldset>
        <fieldset><legend className="mb-2 text-xs text-white/55">Color filter</legend><div className="flex gap-2">
          {FILTERS.map((filter) => <button key={filter.id} type="button" aria-label={`${filter.label} camera filter`} aria-pressed={camera.filter === filter.id} onClick={() => onChange({ filter: filter.id })} className={`h-8 w-8 rounded-full border-2 ${camera.filter === filter.id ? "border-white" : "border-white/10"}`} style={{ backgroundColor: filter.color }} />)}
        </div></fieldset>
        <button type="button" aria-pressed={camera.previewVisible} onClick={() => onChange({ previewVisible: !camera.previewVisible })} className="flex w-full items-center justify-between rounded-xl border border-white/10 px-3 py-3 text-xs text-white"><span>Live preview</span><span className={`h-5 w-9 rounded-full p-0.5 ${camera.previewVisible ? "bg-amber-300" : "bg-white/15"}`}><span className={`block h-4 w-4 rounded-full bg-neutral-950 transition ${camera.previewVisible ? "translate-x-4" : ""}`} /></span></button>
      </div>
    </aside>
  );
}
