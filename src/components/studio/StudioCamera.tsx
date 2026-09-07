/**
 * @file StudioCamera.tsx
 * @description Generic professional camera rig, live viewfinder UI, and camera configuration controls.
 * @scope cinelab-studio
 * @depends @react-three/drei, three
 */

"use client";

import { Html, TransformControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Euler,
  PerspectiveCamera,
  Quaternion,
  Vector3,
} from "three";
import type { Group } from "three";
import { CameraFeedRenderer, exposureMultiplier, verticalFieldOfView } from "@/lib/studio/camera-feed";

import { CAMERA_LENSES, type CameraLensId } from "@/lib/studio/camera-lenses";

export type CameraBodyId = "proDslr";
export type { CameraLensId } from "@/lib/studio/camera-lenses";
export type CameraFilterId = "neutral" | "warm" | "cool" | "mono" | "cinematic";

export type StudioCameraAsset = {
  id: string;
  position: [number, number, number];
  homePosition: [number, number, number];
  rotation: [number, number, number];
  headRotation: [number, number, number];
  height: number;
  body: CameraBodyId;
  lens: CameraLensId;
  iso: number;
  aperture: number;
  shutterIndex: number;
  focusDistance: number;
  zoomMm: number;
  bokeh: number;
  filter: CameraFilterId;
  previewVisible: boolean;
};

export type CameraPatch = Partial<
  Omit<StudioCameraAsset, "id" | "position" | "homePosition" | "rotation">
>;

const CAMERA_BODIES: Record<CameraBodyId, { label: string; size: [number, number, number] }> = {
  proDslr: { label: "Professional full-frame DSLR", size: [0.26, 0.19, 0.15] },
};


const SHUTTER_SPEEDS = [
  "30s", "15s", "8s", "4s", "2s", "1s", "1/2", "1/4", "1/8", "1/15", "1/30",
  "1/60", "1/125", "1/250", "1/500", "1/1000", "1/2000", "1/4000", "1/8000",
];
const ISO_VALUES = [64, 100, 200, 400, 800, 1600, 3200, 6400, 12800, 25600];

const FILTERS: Array<{ id: CameraFilterId; label: string; color: string }> = [
  { id: "neutral", label: "Neutral", color: "#d5d5d5" },
  { id: "warm", label: "Warm", color: "#f0a15f" },
  { id: "cool", label: "Cool", color: "#7ea6dd" },
  { id: "mono", label: "Mono", color: "#777777" },
  { id: "cinematic", label: "Cinema", color: "#4d756e" },
];

const HEAD_AXES = ["X", "Y", "Z"] as const;

function shutterSeconds(index: number) {
  const value = SHUTTER_SPEEDS[index] ?? "1/125";
  if (value.endsWith("s")) return Number.parseFloat(value);
  const denominator = Number.parseFloat(value.split("/")[1] ?? "125");
  return 1 / denominator;
}

export function CameraFeedCapture({
  camera,
  canvas,
}: {
  camera: StudioCameraAsset;
  canvas: HTMLCanvasElement | null;
}) {
  const virtualCameraRef = useRef(new PerspectiveCamera(40, 16 / 9, 0.05, 100));
  const rendererRef = useRef<CameraFeedRenderer | null>(null);
  const pixels = useMemo(() => new Uint8Array(480 * 270 * 4), []);
  const elapsed = useRef(0);

  useEffect(() => {
    const renderer = new CameraFeedRenderer();
    rendererRef.current = renderer;
    return () => { rendererRef.current = null; renderer.dispose(); };
  }, []);

  useFrame(({ gl, scene }, delta) => {
    if (!canvas || !camera.previewVisible || !rendererRef.current) return;
    elapsed.current += delta;
    if (elapsed.current < 1 / 12) return;
    elapsed.current = 0;
    const virtualCamera = virtualCameraRef.current;

    const rigRotation = new Quaternion().setFromEuler(new Euler(...camera.rotation));
    const headRotation = new Quaternion().setFromEuler(
      new Euler(
        (camera.headRotation[0] * Math.PI) / 180,
        (camera.headRotation[1] * Math.PI) / 180,
        (camera.headRotation[2] * Math.PI) / 180,
      ),
    );
    const worldRotation = rigRotation.clone().multiply(headRotation);
    const lens = CAMERA_LENSES[camera.lens];
    const zoomRange = lens.focalMax - lens.focalMin;
    const zoomProgress = zoomRange === 0 ? 0 : (camera.zoomMm - lens.focalMin) / zoomRange;
    const lensLength = lens.lengthMin + (lens.lengthMax - lens.lengthMin) * zoomProgress;
    const forward = new Vector3(0, 0, 1).applyQuaternion(worldRotation);
    const origin = new Vector3(0, camera.height, 0)
      .applyQuaternion(rigRotation)
      .add(new Vector3(...camera.position))
      .add(forward.clone().multiplyScalar(CAMERA_BODIES[camera.body].size[2] / 2 + lensLength + 0.04));
    virtualCamera.position.copy(origin);
    virtualCamera.up.copy(new Vector3(0, 1, 0).applyQuaternion(worldRotation));
    virtualCamera.lookAt(origin.clone().add(forward));
    virtualCamera.fov = verticalFieldOfView(camera.zoomMm);
    virtualCamera.updateProjectionMatrix();
    virtualCamera.updateMatrixWorld();

    rendererRef.current.render(gl, scene, virtualCamera, {
      exposure: exposureMultiplier(camera.iso, camera.aperture, shutterSeconds(camera.shutterIndex)),
      aperture: camera.aperture,
      focalLengthMm: camera.zoomMm,
      focusDistance: camera.focusDistance,
      bokeh: camera.bokeh,
    }, pixels);

    const context = canvas.getContext("2d");
    if (!context) return;
    const image = context.createImageData(480, 270);
    const rowSize = 480 * 4;
    for (let row = 0; row < 270; row += 1) {
      const sourceStart = (269 - row) * rowSize;
      image.data.set(pixels.subarray(sourceStart, sourceStart + rowSize), row * rowSize);
    }
    context.putImageData(image, 0, 0);
  }, -1);

  return null;
}

function RigTube({
  start,
  end,
  radius,
}: {
  start: [number, number, number];
  end: [number, number, number];
  radius: number;
}) {
  const transform = useMemo(() => {
    const from = new Vector3(...start);
    const to = new Vector3(...end);
    const direction = to.clone().sub(from);
    return {
      length: direction.length(),
      midpoint: from.add(to).multiplyScalar(0.5),
      quaternion: new Quaternion().setFromUnitVectors(
        new Vector3(0, 1, 0),
        direction.normalize(),
      ),
    };
  }, [end, start]);

  return (
    <mesh position={transform.midpoint} quaternion={transform.quaternion} castShadow>
      <cylinderGeometry args={[radius, radius * 1.08, transform.length, 14]} />
      <meshStandardMaterial color="#141517" metalness={0.86} roughness={0.2} />
    </mesh>
  );
}

export function StudioCameraRig({
  camera,
  selected,
  transformMode,
  onSelect,
  onOpenSettings,
  onTransforming,
  onMoveEnd,
  onRotateEnd,
}: {
  camera: StudioCameraAsset;
  selected: boolean;
  transformMode: "translate" | "rotate";
  onSelect: () => void;
  onOpenSettings: () => void;
  onTransforming: (active: boolean) => void;
  onMoveEnd: (position: [number, number, number]) => void;
  onRotateEnd: (rotation: [number, number, number]) => void;
}) {
  const [rigObject, setRigObject] = useState<Group | null>(null);
  const body = CAMERA_BODIES[camera.body];
  const lens = CAMERA_LENSES[camera.lens];
  const zoomRange = lens.focalMax - lens.focalMin;
  const zoomProgress = zoomRange === 0 ? 0 : (camera.zoomMm - lens.focalMin) / zoomRange;
  const lensLength = lens.lengthMin + (lens.lengthMax - lens.lengthMin) * zoomProgress;
  const poleStart = 0.5;
  const poleEnd = Math.max(camera.height - 0.18, 0.72);
  const poleLength = poleEnd - poleStart;

  return (
    <>
      <group
        ref={setRigObject}
        position={camera.position}
        rotation={camera.rotation}
        onPointerDown={(event) => {
          event.stopPropagation();
          onSelect();
        }}
      >
        <mesh position={[0, poleStart + poleLength / 2, 0]} castShadow>
          <cylinderGeometry args={[0.045, 0.062, poleLength, 16]} />
          <meshStandardMaterial color="#141517" metalness={0.88} roughness={0.2} />
        </mesh>
        {[0, (Math.PI * 2) / 3, (Math.PI * 4) / 3].map((angle) => {
          const foot: [number, number, number] = [
            Math.cos(angle) * 0.68,
            0.05,
            Math.sin(angle) * 0.68,
          ];
          return (
            <group key={angle}>
              <RigTube start={[0, 0.52, 0]} end={foot} radius={0.03} />
              <mesh position={foot} rotation={[0, -angle, 0]} castShadow>
                <boxGeometry args={[0.16, 0.04, 0.075]} />
                <meshStandardMaterial color="#101113" />
              </mesh>
            </group>
          );
        })}
        <group
          position={[0, camera.height, 0]}
          rotation={camera.headRotation.map((value) => (value * Math.PI) / 180) as [number, number, number]}
        >
          <mesh position={[0, -0.12, 0]} castShadow>
            <cylinderGeometry args={[0.12, 0.1, 0.24, 18]} />
            <meshStandardMaterial color="#202225" metalness={0.8} roughness={0.22} />
          </mesh>
          <mesh castShadow>
            <boxGeometry args={body.size} />
            <meshStandardMaterial
              color={selected ? "#514525" : "#34373b"}
              metalness={0.46}
              roughness={0.34}
            />
          </mesh>
          <mesh position={[body.size[0] * 0.48, -0.04, 0.02]} castShadow>
            <boxGeometry args={[0.14, body.size[1] * 0.8, body.size[2] * 0.55]} />
            <meshStandardMaterial color="#101113" roughness={0.55} />
          </mesh>
          <mesh position={[0, body.size[1] * 0.62, -0.02]} castShadow>
            <boxGeometry args={[0.2, 0.1, 0.18]} />
            <meshStandardMaterial color="#242629" metalness={0.68} roughness={0.24} />
          </mesh>
          <mesh position={[0, 0, -body.size[2] / 2 - 0.003]} rotation={[0, Math.PI, 0]}>
            <planeGeometry args={[body.size[0] * 0.58, body.size[1] * 0.48]} />
            <meshStandardMaterial color="#173044" emissive="#0d2231" emissiveIntensity={0.35} />
          </mesh>
          <mesh position={[-body.size[0] * 0.3, body.size[1] * 0.58, 0]} castShadow>
            <cylinderGeometry args={[0.027, 0.027, 0.022, 18]} />
            <meshStandardMaterial color="#777b80" metalness={0.85} roughness={0.18} />
          </mesh>
          <mesh position={[0, 0, body.size[2] / 2 + lensLength / 2]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[lens.radius * 0.9, lens.radius, lensLength, 32]} />
            <meshStandardMaterial color="#111214" metalness={0.72} roughness={0.2} />
          </mesh>
          <mesh position={[0, 0, body.size[2] / 2 + lensLength + 0.005]}>
            <circleGeometry args={[lens.radius * 0.82, 32]} />
            <meshPhysicalMaterial color="#193043" metalness={0.2} roughness={0.06} clearcoat={1} />
          </mesh>
        </group>
        {selected ? (
          <Html position={[0, camera.height + 0.62, 0]} center zIndexRange={[20, 0]}>
            <button
              type="button"
              aria-label="Open camera settings"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                onOpenSettings();
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-[#171819]/95 text-white shadow-xl transition hover:border-amber-300/70 hover:text-amber-200"
            >
              <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M6 14v6" />
              </svg>
            </button>
          </Html>
        ) : null}
      </group>
      {selected && rigObject ? (
        <TransformControls
          object={rigObject}
          mode={transformMode}
          space={transformMode === "translate" ? "world" : "local"}
          size={0.85}
          onPointerDown={(event) => event.stopPropagation()}
          onMouseDown={() => onTransforming(true)}
          onMouseUp={() => {
            onTransforming(false);
            if (transformMode === "translate") {
              onMoveEnd([rigObject.position.x, rigObject.position.y, rigObject.position.z]);
            } else {
              onRotateEnd([rigObject.rotation.x, rigObject.rotation.y, rigObject.rotation.z]);
            }
          }}
        />
      ) : null}
    </>
  );
}

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
    <section aria-label="Camera preview" className="absolute left-1/2 top-20 sm:top-4 w-[min(25rem,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-2xl border border-white/15 bg-[#090a0b]/95 shadow-2xl shadow-black/50 backdrop-blur-xl">
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
        <label className="text-[10px] text-white/45">
          Bokeh · {camera.bokeh}%
          <input aria-label="Bokeh" type="range" min="0" max="100" step="1" value={camera.bokeh} onChange={(event) => onChange({ bokeh: Number(event.target.value) })} className="mt-1 w-full accent-amber-300" />
        </label>
        <label className={`text-[10px] ${isZoomLens ? "text-white/45" : "text-white/20"}`}>
          Zoom · {camera.zoomMm} mm
          <input aria-label="Zoom" type="range" min={lens.focalMin} max={lens.focalMax} step="1" value={camera.zoomMm} disabled={!isZoomLens} onChange={(event) => onChange({ zoomMm: Number(event.target.value) })} className="mt-1 w-full accent-amber-300 disabled:opacity-30" />
        </label>
      </div>
    </section>
  );
}

export function CameraSettingsPanel({
  camera,
  onChange,
  onClose,
  onReset,
}: {
  camera: StudioCameraAsset;
  onChange: (patch: CameraPatch) => void;
  onClose: () => void;
  onReset: () => void;
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
    <aside className="absolute right-5 top-1/2 max-h-[calc(100dvh-2rem)] w-72 -translate-y-1/2 overflow-y-auto rounded-2xl border border-white/10 bg-[#151617]/95 p-4 shadow-2xl shadow-black/45 backdrop-blur-2xl">
      <div className="mb-5 flex items-center justify-between">
        <div><p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">Selected camera</p><h2 className="mt-1 text-sm font-medium">Camera settings</h2></div>
        <button type="button" aria-label="Close camera settings" onClick={onClose} className="h-8 w-8 rounded-full text-white/50 hover:bg-white/10 hover:text-white">×</button>
      </div>
      <div className="space-y-5">
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
