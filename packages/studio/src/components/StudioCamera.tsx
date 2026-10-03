/**
 * @file StudioCamera.tsx
 * @description Public entry for the studio camera: rig, live capture, preview window and settings panel.
 * @scope cinelab-studio
 * @depends camera-types, CameraFeedCapture, StudioCameraRig, CameraPreview, CameraSettingsPanel
 */

export * from "./camera/camera-types";
export { CameraFeedCapture } from "./camera/CameraFeedCapture";
export { StudioCameraRig } from "./camera/StudioCameraRig";
export { CameraPreview } from "./camera/CameraPreview";
export { CameraSettingsPanel } from "./camera/CameraSettingsPanel";
