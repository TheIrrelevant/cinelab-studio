/**
 * @file camera-lenses.ts
 * @description Shared lens specifications for camera controls and persisted scene validation.
 * @depends none
 */
export type CameraLensId = "wideZoom" | "standardZoom" | "teleZoom" | "prime50" | "prime85";

export const CAMERA_LENSES: Record<
  CameraLensId,
  {
    label: string;
    focalMin: number;
    focalMax: number;
    maxAperture: number;
    minFocus: number;
    lengthMin: number;
    lengthMax: number;
    radius: number;
  }
> = {
  wideZoom: { label: "14–24 mm f/2.8", focalMin: 14, focalMax: 24, maxAperture: 2.8, minFocus: 0.28, lengthMin: 0.132, lengthMax: 0.142, radius: 0.049 },
  standardZoom: { label: "24–70 mm f/2.8", focalMin: 24, focalMax: 70, maxAperture: 2.8, minFocus: 0.38, lengthMin: 0.155, lengthMax: 0.178, radius: 0.044 },
  teleZoom: { label: "70–200 mm f/2.8", focalMin: 70, focalMax: 200, maxAperture: 2.8, minFocus: 1.1, lengthMin: 0.203, lengthMax: 0.223, radius: 0.044 },
  prime50: { label: "50 mm f/1.8 prime", focalMin: 50, focalMax: 50, maxAperture: 1.8, minFocus: 0.45, lengthMin: 0.052, lengthMax: 0.052, radius: 0.036 },
  prime85: { label: "85 mm f/1.4 prime", focalMin: 85, focalMax: 85, maxAperture: 1.4, minFocus: 0.85, lengthMin: 0.084, lengthMax: 0.084, radius: 0.043 },
};
