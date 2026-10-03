/**
 * @file Studio.tsx
 * @description Interactive Three.js photo studio with a cyclorama, asset toolbar, and movable tripod lights.
 * @scope cinelab-studio
 * @depends @react-three/fiber, @react-three/drei, three
 */

"use client";

import { Html, OrbitControls, TransformControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentRef,
  type ReactNode,
} from "react";
import {
  BufferGeometry,
  DoubleSide,
  Float32BufferAttribute,
  MOUSE,
  MeshStandardMaterial,
  Object3D,
  Quaternion,
  Vector3,
} from "three";
import type { Group } from "three";
import {
  CameraPreview,
  CameraSettingsPanel,
  CameraFeedCapture,
  StudioCameraRig,
  type CameraPatch,
  type StudioCameraAsset,
} from "./StudioCamera";

import { readScene, writeScene, nextAssetCounter, type StudioLight } from "@/lib/studio/scene-storage";
import { CAPTURE_INTENSITY_KEY, FLASH_COLOR, lightRenderParams } from "@/lib/studio/light-rendering";

type ToolId = "light" | "camera" | "model" | "pose" | "object" | "move" | "rotate" | "delete";

type TransformMode = "translate" | "rotate";
type LightPatch = Partial<Omit<StudioLight, "id" | "position" | "homePosition" | "rotation">>;

const LIGHT_COLORS = ["#fff0d2", "#ffffff", "#d8e8ff", "#ffb36b", "#ef5350"];
const HEAD_ROTATION_AXES = ["X", "Y", "Z"] as const;
const RGB_CHANNELS = ["R", "G", "B"] as const;
const DEFAULT_LIGHT_HEIGHT = 2.4;
const MIN_LIGHT_HEIGHT = 1.3;
const MAX_LIGHT_HEIGHT = 10;

function normalizeHex(value: string) {
  const candidate = value.startsWith("#") ? value : `#${value}`;
  if (/^#[0-9a-fA-F]{6}$/.test(candidate)) return candidate.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(candidate)) {
    return `#${candidate[1]}${candidate[1]}${candidate[2]}${candidate[2]}${candidate[3]}${candidate[3]}`.toLowerCase();
  }
  return null;
}

function hexToRgb(hex: string): [number, number, number] {
  const normalized = normalizeHex(hex) ?? "#ffffff";
  return [
    Number.parseInt(normalized.slice(1, 3), 16),
    Number.parseInt(normalized.slice(3, 5), 16),
    Number.parseInt(normalized.slice(5, 7), 16),
  ];
}

function rgbToHex(rgb: [number, number, number]) {
  return `#${rgb
    .map((channel) => Math.max(0, Math.min(255, channel)).toString(16).padStart(2, "0"))
    .join("")}`;
}

const ASSET_TOOLS: Array<{ id: ToolId; label: string }> = [
  { id: "light", label: "Light" },
  { id: "camera", label: "Camera" },
  { id: "model", label: "Model" },
  { id: "pose", label: "Pose" },
  { id: "object", label: "Object" },
];

const TRANSFORM_TOOLS: Array<{ id: ToolId; label: string }> = [
  { id: "move", label: "Move" },
  { id: "rotate", label: "Rotate" },
];

function ToolIcon({ tool }: { tool: ToolId }) {
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

function Cyclorama() {
  const geometry = useMemo(() => {
    const halfWidth = 30;
    const profile: Array<[number, number]> = [
      [8, 0],
      [-5.5, 0],
    ];

    for (let step = 1; step <= 12; step += 1) {
      const angle = (step / 12) * (Math.PI / 2);
      profile.push([
        -5.5 - Math.sin(angle) * 2,
        2 - Math.cos(angle) * 2,
      ]);
    }
    profile.push([-7.5, 10]);

    const positions: number[] = [];
    const indices: number[] = [];
    profile.forEach(([z, y]) => {
      positions.push(-halfWidth, y, z, halfWidth, y, z);
    });
    for (let index = 0; index < profile.length - 1; index += 1) {
      const left = index * 2;
      indices.push(left, left + 1, left + 2, left + 1, left + 3, left + 2);
    }

    const result = new BufferGeometry();
    result.setAttribute("position", new Float32BufferAttribute(positions, 3));
    result.setIndex(indices);
    result.computeVertexNormals();
    return result;
  }, []);
  const material = useMemo(
    () => new MeshStandardMaterial({ color: "#777a7d", roughness: 0.86 }),
    [],
  );

  return <mesh geometry={geometry} material={material} receiveShadow />;
}

function TubeBetween({
  start,
  end,
  radius,
  color = "#161719",
}: {
  start: [number, number, number];
  end: [number, number, number];
  radius: number;
  color?: string;
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
      <meshStandardMaterial color={color} metalness={0.82} roughness={0.22} />
    </mesh>
  );
}

function SoftboxModifier({
  color,
  width,
  height,
}: {
  color: string;
  width: number;
  height: number;
}) {
  const widthMeters = width / 100;
  const heightMeters = height / 100;
  const depth = Math.max(0.35, Math.min(0.9, Math.max(widthMeters, heightMeters) * 0.65));
  const shell = useMemo(() => {
    const backWidth = 0.22;
    const backHeight = 0.16;
    const frontWidth = widthMeters;
    const frontHeight = heightMeters;
    const backZ = 0.4;
    const frontZ = backZ + depth;
    const positions = [
      -backWidth, -backHeight, backZ,
      backWidth, -backHeight, backZ,
      backWidth, backHeight, backZ,
      -backWidth, backHeight, backZ,
      -frontWidth / 2, -frontHeight / 2, frontZ,
      frontWidth / 2, -frontHeight / 2, frontZ,
      frontWidth / 2, frontHeight / 2, frontZ,
      -frontWidth / 2, frontHeight / 2, frontZ,
    ];
    const indices = [
      0, 1, 5, 0, 5, 4,
      1, 2, 6, 1, 6, 5,
      2, 3, 7, 2, 7, 6,
      3, 0, 4, 3, 4, 7,
    ];
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  }, [depth, heightMeters, widthMeters]);

  const frontZ = 0.4 + depth;

  return (
    <group>
      <mesh geometry={shell} castShadow>
        <meshStandardMaterial color="#111214" roughness={0.72} side={DoubleSide} />
      </mesh>
      <mesh position={[0, 0, frontZ + 0.005]}>
        <planeGeometry args={[widthMeters * 0.96, heightMeters * 0.94]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={1.35}
          roughness={0.92}
        />
      </mesh>
      <mesh position={[0, 0, frontZ + 0.015]}>
        <planeGeometry args={[widthMeters, heightMeters]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.08} wireframe />
      </mesh>
    </group>
  );
}

function ProfessionalLightHead({
  light,
  selected,
  lightTarget,
}: {
  light: StudioLight;
  selected: boolean;
  lightTarget: Object3D;
}) {
  const hasSoftbox = light.modifier === "softbox";
  const softboxDepth = Math.max(
    0.35,
    Math.min(0.9, Math.max(light.softboxWidth, light.softboxHeight) * 0.0065),
  );
  const softboxFrontZ = 0.4 + softboxDepth;
  const params = lightRenderParams(light);

  return (
    <>
      <mesh position={[0, 0, -0.16]} castShadow>
        <boxGeometry args={[0.5, 0.36, 0.62]} />
        <meshStandardMaterial
          color={selected ? "#302719" : "#151618"}
          metalness={0.58}
          roughness={0.3}
        />
      </mesh>
      <mesh position={[0, 0, -0.53]} castShadow>
        <boxGeometry args={[0.32, 0.24, 0.12]} />
        <meshStandardMaterial color="#242629" metalness={0.72} roughness={0.25} />
      </mesh>
      <mesh position={[0, 0, 0.25]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.28, 0.34, 32, 1, true]} />
        <meshStandardMaterial
          color="#777a7d"
          metalness={0.92}
          roughness={0.16}
          side={DoubleSide}
        />
      </mesh>
      <mesh position={[0, 0, 0.43]}>
        <circleGeometry args={[0.17, 32]} />
        <meshStandardMaterial
          color={params.color}
          emissive={params.color}
          emissiveIntensity={params.emissiveIntensity}
        />
      </mesh>
      <mesh position={[0, 0, 0.44]}>
        <torusGeometry args={[0.27, 0.025, 12, 36]} />
        <meshStandardMaterial color="#303235" metalness={0.9} roughness={0.18} />
      </mesh>
      {hasSoftbox ? (
        <SoftboxModifier
          color={params.color}
          width={light.softboxWidth}
          height={light.softboxHeight}
        />
      ) : null}
      <spotLight
        position={[0, 0, hasSoftbox ? softboxFrontZ + 0.02 : 0.46]}
        target={lightTarget}
        angle={params.angle}
        penumbra={params.penumbra}
        intensity={params.intensity}
        userData={{ [CAPTURE_INTENSITY_KEY]: params.captureIntensity }}
        distance={24}
        color={params.color}
        castShadow
      />
      <primitive object={lightTarget} position={[0, 0, 6]} />
    </>
  );
}

function TripodLight({
  light,
  selected,
  onSelect,
  onTransforming,
  onMoveEnd,
  onRotateEnd,
  onOpenSettings,
  transformMode,
}: {
  light: StudioLight;
  selected: boolean;
  onSelect: () => void;
  onTransforming: (active: boolean) => void;
  onMoveEnd: (position: [number, number, number]) => void;
  onRotateEnd: (rotation: [number, number, number]) => void;
  onOpenSettings: () => void;
  transformMode: TransformMode;
}) {
  const [lightObject, setLightObject] = useState<Group | null>(null);
  const lightTarget = useMemo(() => new Object3D(), []);
  const poleStart = 0.58;
  const poleEnd = Math.max(light.height - 0.22, 0.88);
  const poleLength = poleEnd - poleStart;
  const poleCenter = poleStart + poleLength / 2;

  return (
    <>
      <group
        ref={setLightObject}
        position={light.position}
        rotation={light.rotation}
        onPointerDown={(event) => {
          event.stopPropagation();
          onSelect();
        }}
      >
        <mesh position={[0, poleCenter, 0]} castShadow>
          <cylinderGeometry args={[0.055, 0.075, poleLength, 18]} />
          <meshStandardMaterial color="#151618" metalness={0.88} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0.6, 0]} castShadow>
          <cylinderGeometry args={[0.105, 0.105, 0.2, 18]} />
          <meshStandardMaterial color="#242629" metalness={0.86} roughness={0.2} />
        </mesh>
        {[0, (Math.PI * 2) / 3, (Math.PI * 4) / 3].map((angle) => {
          const foot: [number, number, number] = [
            Math.cos(angle) * 0.78,
            0.055,
            Math.sin(angle) * 0.78,
          ];
          const braceEnd: [number, number, number] = [
            Math.cos(angle) * 0.46,
            0.3,
            Math.sin(angle) * 0.46,
          ];
          return (
            <group key={angle}>
              <TubeBetween start={[0, 0.58, 0]} end={foot} radius={0.034} />
              <TubeBetween start={[0, 0.82, 0]} end={braceEnd} radius={0.017} color="#343639" />
              <mesh position={foot} rotation={[0, -angle, 0]} castShadow>
                <boxGeometry args={[0.18, 0.045, 0.08]} />
                <meshStandardMaterial color="#101113" roughness={0.5} />
              </mesh>
            </group>
          );
        })}
        <mesh position={[0, poleEnd, 0]} castShadow>
          <cylinderGeometry args={[0.085, 0.085, 0.16, 18]} />
          <meshStandardMaterial color="#292b2e" metalness={0.82} roughness={0.22} />
        </mesh>
        <group
          position={[0, light.height, 0]}
          rotation={[
            (light.headRotation[0] * Math.PI) / 180,
            (light.headRotation[1] * Math.PI) / 180,
            (light.headRotation[2] * Math.PI) / 180,
          ]}
        >
          <ProfessionalLightHead light={light} selected={selected} lightTarget={lightTarget} />
        </group>
        {selected ? (
          <Html position={[0, light.height + 0.68, 0]} center zIndexRange={[20, 0]}>
            <button
              type="button"
              aria-label="Open light settings"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                onOpenSettings();
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-[#171819]/95 text-white shadow-xl shadow-black/35 backdrop-blur-xl transition hover:scale-105 hover:border-amber-300/70 hover:text-amber-200"
            >
              <svg
                aria-hidden="true"
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              >
                <path d="M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M6 14v6" />
              </svg>
            </button>
          </Html>
        ) : null}
      </group>
      {selected && lightObject ? (
        <TransformControls
          object={lightObject}
          mode={transformMode}
          space={transformMode === "translate" ? "world" : "local"}
          size={0.85}
          onPointerDown={(event) => event.stopPropagation()}
          onMouseDown={() => onTransforming(true)}
          onMouseUp={() => {
            onTransforming(false);
            if (transformMode === "translate" && lightObject) {
              onMoveEnd([
                lightObject.position.x,
                lightObject.position.y,
                lightObject.position.z,
              ]);
            }
            if (transformMode === "rotate") {
              onRotateEnd([
                lightObject.rotation.x,
                lightObject.rotation.y,
                lightObject.rotation.z,
              ]);
            }
          }}
        />
      ) : null}
    </>
  );
}

function StudioNavigation({ enabled }: { enabled: boolean }) {
  const controlsRef = useRef<ComponentRef<typeof OrbitControls>>(null);
  const pressedKeys = useRef(new Set<string>());
  const { camera } = useThree();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, [contenteditable='true']")) return;
      const key = event.key.toLowerCase();
      if (["w", "a", "s", "d"].includes(key)) {
        event.preventDefault();
        pressedKeys.current.add(key);
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      pressedKeys.current.delete(event.key.toLowerCase());
    };
    const clearKeys = () => pressedKeys.current.clear();

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", clearKeys);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", clearKeys);
    };
  }, []);

  useFrame((_, delta) => {
    if (!enabled || pressedKeys.current.size === 0) return;

    const forward = new Vector3();
    const right = new Vector3();
    const movement = new Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    right.crossVectors(forward, camera.up).normalize();
    movement.set(0, 0, 0);

    if (pressedKeys.current.has("w")) movement.add(forward);
    if (pressedKeys.current.has("s")) movement.sub(forward);
    if (pressedKeys.current.has("d")) movement.add(right);
    if (pressedKeys.current.has("a")) movement.sub(right);

    if (movement.lengthSq() === 0) return;
    movement.normalize().multiplyScalar(5.5 * delta);
    camera.position.add(movement);
    controlsRef.current?.target.add(movement);
    controlsRef.current?.update();
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enabled={enabled}
      target={[0, 2.2, -1.5]}
      minDistance={2.5}
      maxDistance={24}
      maxPolarAngle={Math.PI / 2.04}
      enablePan={false}
      mouseButtons={{
        LEFT: MOUSE.ROTATE,
        MIDDLE: MOUSE.DOLLY,
        RIGHT: MOUSE.PAN,
      }}
    />
  );
}

function StudioScene({
  lights,
  cameras,
  previewCamera,
  previewCanvas,
  selectedId,
  selectedCameraId,
  onSelect,
  onSelectCamera,
  onMoveLight,
  onRotateLight,
  onMoveCamera,
  onRotateCamera,
  onOpenLightSettings,
  onOpenCameraSettings,
  transformMode,
}: {
  lights: StudioLight[];
  cameras: StudioCameraAsset[];
  previewCamera: StudioCameraAsset | undefined;
  previewCanvas: HTMLCanvasElement | null;
  selectedId: string | null;
  selectedCameraId: string | null;
  onSelect: (id: string | null) => void;
  onSelectCamera: (id: string) => void;
  onMoveLight: (id: string, position: [number, number, number]) => void;
  onRotateLight: (id: string, rotation: [number, number, number]) => void;
  onMoveCamera: (id: string, position: [number, number, number]) => void;
  onRotateCamera: (id: string, rotation: [number, number, number]) => void;
  onOpenLightSettings: (id: string) => void;
  onOpenCameraSettings: (id: string) => void;
  transformMode: TransformMode;
}) {
  const [transforming, setTransforming] = useState(false);

  return (
    <>
      <color attach="background" args={["#292b2d"]} />
      <fog attach="fog" args={["#292b2d", 18, 34]} />
      <ambientLight intensity={0.65} />
      <directionalLight
        position={[4, 9, 6]}
        intensity={2.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <Cyclorama />
      {lights.map((light) => (
        <TripodLight
          key={light.id}
          light={light}
          selected={light.id === selectedId}
          onSelect={() => onSelect(light.id)}
          onTransforming={setTransforming}
          onMoveEnd={(position) => onMoveLight(light.id, position)}
          onRotateEnd={(rotation) => onRotateLight(light.id, rotation)}
          onOpenSettings={() => onOpenLightSettings(light.id)}
          transformMode={transformMode}
        />
      ))}
      {cameras.map((camera) => (
        <StudioCameraRig
          key={camera.id}
          camera={camera}
          selected={camera.id === selectedCameraId}
          transformMode={transformMode}
          onSelect={() => onSelectCamera(camera.id)}
          onOpenSettings={() => onOpenCameraSettings(camera.id)}
          onTransforming={setTransforming}
          onMoveEnd={(position) => onMoveCamera(camera.id, position)}
          onRotateEnd={(rotation) => onRotateCamera(camera.id, rotation)}
        />
      ))}
      {previewCamera ? <CameraFeedCapture camera={previewCamera} canvas={previewCanvas} /> : null}
      <StudioNavigation enabled={!transforming} />
    </>
  );
}

export function LightSettingsPanel({
  light,
  onChange,
  onClose,
  onResetTransform,
}: {
  light: StudioLight;
  onChange: (patch: LightPatch) => void;
  onClose: () => void;
  onResetTransform: () => void;
}) {
  const [hexDraft, setHexDraft] = useState(light.color.toUpperCase());
  const isFlash = light.lightType === "flash";
  const displayColor = isFlash ? FLASH_COLOR : light.color;
  const rgb = hexToRgb(displayColor);

  const setColor = (color: string) => {
    if (isFlash) return;
    setHexDraft(color.toUpperCase());
    onChange({ color });
  };

  const setRgbChannel = (channelIndex: number, value: number) => {
    const nextRgb: [number, number, number] = [...rgb];
    nextRgb[channelIndex] = Math.max(0, Math.min(255, Number.isFinite(value) ? value : 0));
    setColor(rgbToHex(nextRgb));
  };

  const setHeadRotation = (axisIndex: number, value: number) => {
    const nextRotation: [number, number, number] = [...light.headRotation];
    nextRotation[axisIndex] = Math.max(-180, Math.min(180, value));
    onChange({ headRotation: nextRotation });
  };

  return (
    <aside className="absolute right-5 top-1/2 max-h-[calc(100dvh-2rem)] w-72 -translate-y-1/2 overflow-y-auto rounded-2xl border border-white/10 bg-[#151617]/95 p-4 shadow-2xl shadow-black/45 backdrop-blur-2xl">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">
            Selected light
          </p>
          <h2 className="mt-1 text-sm font-medium text-white">Light settings</h2>
        </div>
        <button
          type="button"
          aria-label="Close light settings"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-full text-white/50 transition hover:bg-white/10 hover:text-white"
        >
          ×
        </button>
      </div>

      <div className="space-y-5">
        <button
          type="button"
          onClick={onResetTransform}
          className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-left text-xs text-white/65 transition hover:border-amber-300/40 hover:bg-amber-300/10 hover:text-amber-100"
        >
          <span>
            <span className="block font-medium text-white">Default pose</span>
            <span className="mt-0.5 block text-[10px] text-white/35">Reset position and rotation</span>
          </span>
          <svg
            aria-hidden="true"
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          >
            <path d="M4 4v6h6M5.5 9A8 8 0 1 1 4 14" />
          </svg>
        </button>

        <label className="block">
          <span className="mb-2 flex items-center justify-between text-xs text-white/55">
            <span>Stand height</span>
            <span className="text-[10px] text-white/30">meters</span>
          </span>
          <div className="flex items-center rounded-xl border border-white/10 bg-black/25 px-3 focus-within:border-amber-300/70">
            <input
              aria-label="Light stand height"
              type="number"
              min={MIN_LIGHT_HEIGHT}
              max={MAX_LIGHT_HEIGHT}
              step="0.05"
              value={light.height}
              onChange={(event) =>
                onChange({
                  height: Math.max(
                    MIN_LIGHT_HEIGHT,
                    Math.min(MAX_LIGHT_HEIGHT, Number(event.target.value) || MIN_LIGHT_HEIGHT),
                  ),
                })
              }
              className="h-10 w-full bg-transparent text-sm text-white outline-none"
            />
            <span className="text-xs text-white/35">m</span>
          </div>
        </label>

        <fieldset>
          <legend className="mb-2 text-xs text-white/55">Light type</legend>
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-black/25 p-1">
            {(["bare", "flash"] as const).map((lightType) => (
              <button
                key={lightType}
                type="button"
                aria-pressed={light.lightType === lightType}
                onClick={() => onChange({ lightType })}
                className={`rounded-lg px-3 py-2 text-xs font-medium transition ${
                  light.lightType === lightType
                    ? "bg-white text-neutral-950"
                    : "text-white/45 hover:text-white"
                }`}
              >
                {lightType === "bare" ? "Bare Light" : "Flash"}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-xs text-white/55">Softbox</legend>
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-black/25 p-1">
            {(["none", "softbox"] as const).map((modifier) => (
              <button
                key={modifier}
                type="button"
                aria-pressed={light.modifier === modifier}
                onClick={() => onChange({ modifier })}
                className={`rounded-lg px-3 py-2 text-xs font-medium capitalize transition ${
                  light.modifier === modifier
                    ? "bg-white text-neutral-950"
                    : "text-white/45 hover:text-white"
                }`}
              >
                {modifier === "none" ? "Without softbox" : "With softbox"}
              </button>
            ))}
          </div>
        </fieldset>

        {light.modifier === "softbox" ? (
          <fieldset>
            <legend className="mb-3 text-xs text-white/55">Softbox dimensions</legend>
            <div className="space-y-3">
              {([
                ["Width", "softboxWidth", light.softboxWidth],
                ["Height", "softboxHeight", light.softboxHeight],
              ] as const).map(([label, property, value]) => (
                <label key={property} className="grid grid-cols-[42px_1fr_62px] items-center gap-2">
                  <span className="text-[10px] font-medium text-white/40">{label}</span>
                  <input
                    aria-label={`Softbox ${label.toLowerCase()}`}
                    type="range"
                    min="20"
                    max="200"
                    step="1"
                    value={value}
                    onChange={(event) => onChange({ [property]: Number(event.target.value) })}
                    className="w-full accent-amber-300"
                  />
                  <span className="flex items-center rounded-lg bg-black/25 px-2 py-1">
                    <input
                      aria-label={`Softbox ${label.toLowerCase()} centimeters`}
                      type="number"
                      min="20"
                      max="200"
                      step="1"
                      value={value}
                      onChange={(event) =>
                        onChange({
                          [property]: Math.max(
                            20,
                            Math.min(200, Number(event.target.value) || 20),
                          ),
                        })
                      }
                      className="w-8 bg-transparent text-right text-xs text-white outline-none"
                    />
                    <span className="text-[10px] text-white/35">cm</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}

        <fieldset>
          <legend className="mb-3 text-xs text-white/55">Head rotation</legend>
          <div className="space-y-3">
            {HEAD_ROTATION_AXES.map((axis, axisIndex) => (
              <label key={axis} className="grid grid-cols-[18px_1fr_58px] items-center gap-2">
                <span className="text-xs font-semibold text-white/40">{axis}</span>
                <input
                  aria-label={`Head rotation ${axis}`}
                  type="range"
                  min="-180"
                  max="180"
                  step="1"
                  value={light.headRotation[axisIndex]}
                  onChange={(event) => setHeadRotation(axisIndex, Number(event.target.value))}
                  className="w-full accent-amber-300"
                />
                <span className="flex items-center rounded-lg bg-black/25 px-2 py-1">
                  <input
                    aria-label={`Head rotation ${axis} degrees`}
                    type="number"
                    min="-180"
                    max="180"
                    step="1"
                    value={light.headRotation[axisIndex]}
                    onChange={(event) => setHeadRotation(axisIndex, Number(event.target.value))}
                    className="w-8 bg-transparent text-right text-xs text-white outline-none"
                  />
                  <span className="text-xs text-white/35">°</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="block">
          <span className="mb-2 flex justify-between text-xs text-white/55">
            <span>Power</span>
            <span>{Math.round(light.intensity)}</span>
          </span>
          <input
            aria-label="Light power"
            type="range"
            min="10"
            max="220"
            step="1"
            value={light.intensity}
            onChange={(event) => onChange({ intensity: Number(event.target.value) })}
            className="w-full accent-amber-300"
          />
        </label>

        <label className="block">
          <span className="mb-2 flex justify-between text-xs text-white/55">
            <span>Spread</span>
            <span>{Math.round((light.spread * 180) / Math.PI)}°</span>
          </span>
          <input
            aria-label="Light spread"
            type="range"
            min="0.2"
            max="1.15"
            step="0.01"
            value={light.spread}
            onChange={(event) => onChange({ spread: Number(event.target.value) })}
            className="w-full accent-amber-300"
          />
        </label>

        <fieldset disabled={isFlash} className={isFlash ? "opacity-50" : undefined}>
          <legend className="mb-2 text-xs text-white/55">Color</legend>
          {isFlash ? <p className="mb-3 text-[10px] text-white/65">Flash color is locked to 5600K daylight ({FLASH_COLOR.toUpperCase()}).</p> : null}
          <div className="mb-3 flex items-center gap-2">
            {LIGHT_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={`Set light color ${color}`}
                aria-pressed={displayColor === color}
                onClick={() => setColor(color)}
                className={`h-7 w-7 rounded-full border-2 transition hover:scale-110 ${
                  displayColor === color ? "border-white" : "border-white/10"
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
            <input
              aria-label="Light color picker"
              type="color"
              value={displayColor}
              onChange={(event) => setColor(event.target.value)}
              className="h-8 w-8 cursor-pointer rounded-full border-0 bg-transparent p-0"
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {RGB_CHANNELS.map((channel, channelIndex) => (
              <label key={channel} className="block">
                <span className="mb-1 block text-[10px] font-semibold text-white/35">{channel}</span>
                <input
                  aria-label={`${channel} color channel`}
                  type="number"
                  min="0"
                  max="255"
                  value={rgb[channelIndex]}
                  onChange={(event) => setRgbChannel(channelIndex, Number(event.target.value))}
                  className="h-9 w-full rounded-lg border border-white/10 bg-black/25 px-2 text-xs text-white outline-none transition focus:border-amber-300/70"
                />
              </label>
            ))}
          </div>
          <label className="mt-3 block">
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
              Hex
            </span>
            <input
              aria-label="Light color hex code"
              type="text"
              value={isFlash ? FLASH_COLOR.toUpperCase() : hexDraft}
              maxLength={7}
              spellCheck={false}
              onChange={(event) => {
                if (isFlash) return;
                const nextDraft = event.target.value;
                setHexDraft(nextDraft.toUpperCase());
                const normalized = normalizeHex(nextDraft);
                if (normalized) onChange({ color: normalized });
              }}
              onBlur={() => setHexDraft(light.color.toUpperCase())}
              className="h-9 w-full rounded-lg border border-white/10 bg-black/25 px-3 font-mono text-xs uppercase tracking-wider text-white outline-none transition focus:border-amber-300/70"
            />
          </label>
        </fieldset>
      </div>
    </aside>
  );
}

export function Studio() {
  const lightIdCounter = useRef(0);
  const cameraIdCounter = useRef(0);
  const [lights, setLights] = useState<StudioLight[]>([]);
  const [cameras, setCameras] = useState<StudioCameraAsset[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [settingsLightId, setSettingsLightId] = useState<string | null>(null);
  const [settingsCameraId, setSettingsCameraId] = useState<string | null>(null);
  const [previewCanvas, setPreviewCanvas] = useState<HTMLCanvasElement | null>(null);
  const [transformMode, setTransformMode] = useState<TransformMode>("translate");
  const [storageStatus, setStorageStatus] = useState<"loading" | "ready" | "blocked">("loading");
  const [storageNotice, setStorageNotice] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const scene = readScene(window.localStorage);
        lightIdCounter.current = nextAssetCounter(scene.lights);
        cameraIdCounter.current = nextAssetCounter(scene.cameras);
        setLights(scene.lights);
        setCameras(scene.cameras);
        setStorageStatus("ready");
      } catch {
        setStorageStatus("blocked");
        setStorageNotice("Saved scene could not be loaded. Your existing save is preserved; this session will not be saved.");
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (storageStatus !== "ready") return;
    try {
      writeScene(window.localStorage, { version: 1, lights, cameras });
    } catch {
      // Defer the status update to keep the effect free of synchronous state changes.
      const timer = window.setTimeout(() => {
        setStorageStatus("blocked");
        setStorageNotice("Scene could not be saved. Your previous save is preserved; changes are only available in this session.");
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [cameras, lights, storageStatus]);

  const addLight = () => {
    if (storageStatus === "loading") return;
    const id = `light-${lightIdCounter.current}`;
    lightIdCounter.current += 1;
    const position: [number, number, number] = [
      Math.min(lights.length * 1.4 - 1.4, 4),
      0,
      1.5,
    ];
    setLights((current) => [
      ...current,
      {
        id,
        position,
        homePosition: [...position] as [number, number, number],
        headRotation: [0, 0, 0],
        height: DEFAULT_LIGHT_HEIGHT,
        lightType: "bare",
        rotation: [0, 0, 0],
        modifier: "none",
        softboxWidth: 90,
        softboxHeight: 60,
        intensity: 95,
        spread: 0.62,
        color: "#fff0d2",
      },
    ]);
    setSelectedId(id);
    setSelectedCameraId(null);
    setSettingsLightId(null);
    setSettingsCameraId(null);
    setTransformMode("translate");
  };

  const addCamera = () => {
    if (storageStatus === "loading") return;
    const id = `camera-${cameraIdCounter.current}`;
    cameraIdCounter.current += 1;
    const position: [number, number, number] = [1.2 + cameras.length * 1.2, 0, 2];
    setCameras((current) => [
      ...current,
      {
        id,
        position,
        homePosition: [...position] as [number, number, number],
        rotation: [0, Math.PI, 0],
        headRotation: [0, 0, 0],
        height: 1.55,
        body: "proDslr",
        lens: "standardZoom",
        iso: 400,
        aperture: 2.8,
        shutterIndex: 12,
        focusDistance: 2,
        zoomMm: 50,
        bokeh: 50,
        filter: "neutral",
        previewVisible: true,
      },
    ]);
    setSelectedCameraId(id);
    setSelectedId(null);
    setSettingsLightId(null);
    setSettingsCameraId(null);
    setTransformMode("translate");
  };

  const moveLight = (id: string, position: [number, number, number]) => {
    setLights((current) =>
      current.map((light) => (light.id === id ? { ...light, position } : light)),
    );
  };

  const updateLight = (id: string, patch: LightPatch) => {
    setLights((current) =>
      current.map((light) => (light.id === id ? { ...light, ...patch } : light)),
    );
  };

  const resetLightTransform = (id: string) => {
    setLights((current) =>
      current.map((light) =>
        light.id === id
          ? {
              ...light,
              position: [...light.homePosition] as [number, number, number],
              rotation: [0, 0, 0] as [number, number, number],
              headRotation: [0, 0, 0] as [number, number, number],
              height: DEFAULT_LIGHT_HEIGHT,
            }
          : light,
      ),
    );
  };

  const rotateLight = (id: string, rotation: [number, number, number]) => {
    setLights((current) =>
      current.map((light) => (light.id === id ? { ...light, rotation } : light)),
    );
  };

  const selectLight = (id: string | null) => {
    if (id !== null && id !== selectedId) setTransformMode("translate");
    setSelectedId(id);
    setSelectedCameraId(null);
    setSettingsCameraId(null);
    if (id === null || id !== settingsLightId) setSettingsLightId(null);
  };

  const updateCamera = (id: string, patch: CameraPatch) => {
    setCameras((current) =>
      current.map((camera) => (camera.id === id ? { ...camera, ...patch } : camera)),
    );
  };

  const moveCamera = (id: string, position: [number, number, number]) => {
    setCameras((current) =>
      current.map((camera) => (camera.id === id ? { ...camera, position } : camera)),
    );
  };

  const rotateCamera = (id: string, rotation: [number, number, number]) => {
    setCameras((current) =>
      current.map((camera) => (camera.id === id ? { ...camera, rotation } : camera)),
    );
  };

  const resetCamera = (id: string) => {
    setCameras((current) =>
      current.map((camera) =>
        camera.id === id
          ? {
              ...camera,
              position: [...camera.homePosition] as [number, number, number],
              rotation: [0, Math.PI, 0] as [number, number, number],
              headRotation: [0, 0, 0] as [number, number, number],
              height: 1.55,
            }
          : camera,
      ),
    );
  };

  const selectCamera = (id: string) => {
    if (id !== selectedCameraId) setTransformMode("translate");
    setSelectedCameraId(id);
    setSelectedId(null);
    setSettingsLightId(null);
    if (id !== settingsCameraId) setSettingsCameraId(null);
  };

  const deleteSelectedAsset = () => {
    if (storageStatus === "loading") return;
    if (selectedId !== null) {
      setLights((current) => current.filter((light) => light.id !== selectedId));
    }
    if (selectedCameraId !== null) {
      setCameras((current) => current.filter((camera) => camera.id !== selectedCameraId));
    }
    setSelectedId(null);
    setSelectedCameraId(null);
    setSettingsLightId(null);
    setSettingsCameraId(null);
    setTransformMode("translate");
  };

  const settingsLight = lights.find((light) => light.id === settingsLightId);
  const settingsCamera = cameras.find((camera) => camera.id === settingsCameraId);
  const previewCamera =
    cameras.find((camera) => camera.id === selectedCameraId && camera.previewVisible) ??
    cameras.find((camera) => camera.previewVisible);

  const renderToolButton = (tool: { id: ToolId; label: string }) => {
    const isTransform = tool.id === "move" || tool.id === "rotate";
    const enabled = storageStatus !== "loading" && (
      tool.id === "light" ||
      tool.id === "camera" ||
      ((isTransform || tool.id === "delete") && (selectedId !== null || selectedCameraId !== null)));
    const active =
      (tool.id === "move" && transformMode === "translate") ||
      (tool.id === "rotate" && transformMode === "rotate");
    const handleClick = () => {
      if (tool.id === "light") addLight();
      if (tool.id === "camera") addCamera();
      if (tool.id === "move") setTransformMode("translate");
      if (tool.id === "rotate") setTransformMode("rotate");
      if (tool.id === "delete") deleteSelectedAsset();
    };

    return (
      <button
        key={tool.id}
        type="button"
        disabled={!enabled}
        aria-pressed={isTransform ? active : undefined}
        onClick={enabled ? handleClick : undefined}
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
    <main className="relative h-dvh w-full overflow-hidden bg-[#292b2d] text-white">
      {storageNotice ? <p role="alert" className="absolute inset-x-4 bottom-28 z-20 mx-auto max-w-xl rounded-xl border border-amber-300/30 bg-neutral-950/95 p-3 text-sm text-amber-100">{storageNotice}</p> : null}
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [8.5, 5.8, 10.5], fov: 42, near: 0.1, far: 100 }}
        gl={{ antialias: true }}
      >
        <StudioScene
          lights={lights}
          cameras={cameras}
          previewCamera={previewCamera}
          previewCanvas={previewCanvas}
          selectedId={selectedId}
          selectedCameraId={selectedCameraId}
          onSelect={selectLight}
          onSelectCamera={selectCamera}
          onMoveLight={moveLight}
          onRotateLight={rotateLight}
          onMoveCamera={moveCamera}
          onRotateCamera={rotateCamera}
          onOpenLightSettings={setSettingsLightId}
          onOpenCameraSettings={setSettingsCameraId}
          transformMode={transformMode}
        />
      </Canvas>

      {previewCamera ? (
        <CameraPreview
          camera={previewCamera}
          onChange={(patch) => updateCamera(previewCamera.id, patch)}
          canvasRef={setPreviewCanvas}
        />
      ) : null}

      {settingsLight ? (
        <LightSettingsPanel
          key={settingsLight.id}
          light={settingsLight}
          onChange={(patch) => updateLight(settingsLight.id, patch)}
          onClose={() => setSettingsLightId(null)}
          onResetTransform={() => resetLightTransform(settingsLight.id)}
        />
      ) : null}

      {settingsCamera ? (
        <CameraSettingsPanel
          camera={settingsCamera}
          onChange={(patch) => updateCamera(settingsCamera.id, patch)}
          onClose={() => setSettingsCameraId(null)}
          onReset={() => resetCamera(settingsCamera.id)}
        />
      ) : null}

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-5 sm:p-7">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/45">
            Cinelab
          </p>
          <h1 className="mt-1 text-lg font-medium tracking-tight">Studio 01</h1>
        </div>
        <div aria-label="Scene asset count" className="rounded-full border border-white/10 bg-black/25 px-3 py-1.5 text-xs text-white/55 backdrop-blur-xl">
          {lights.length} {lights.length === 1 ? "light" : "lights"} · {cameras.length}{" "}
          {cameras.length === 1 ? "camera" : "cameras"}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-24 hidden text-center sm:block">
        <p className="inline-flex rounded-full bg-black/25 px-3 py-1.5 text-xs text-white/50 backdrop-blur-lg">
          WASD to move · Left drag to look · Scroll to zoom
        </p>
      </div>

      <nav
        aria-label="Studio tools"
        className="absolute bottom-5 left-1/2 flex w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-0 rounded-2xl sm:w-auto sm:gap-1 border border-white/10 bg-[#141516]/90 p-1.5 shadow-2xl shadow-black/40 backdrop-blur-2xl"
      >
        {ASSET_TOOLS.map(renderToolButton)}
        <span aria-hidden="true" className="mx-1 h-8 w-px bg-white/10" />
        {TRANSFORM_TOOLS.map(renderToolButton)}
        {renderToolButton({ id: "delete", label: "Delete" })}
      </nav>
    </main>
  );
}
