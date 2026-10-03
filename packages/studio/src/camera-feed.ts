/**
 * @file camera-feed.ts
 * @description HDR camera preview with depth-aware thin-lens defocus and explicit display conversion.
 * @depends three, ./light-rendering
 */
import {
  DepthTexture, HalfFloatType, Mesh, OrthographicCamera, PlaneGeometry,
  Scene, ShaderMaterial, Vector2, WebGLRenderTarget,
  type PerspectiveCamera, type WebGLRenderer, type Object3D,
} from "three";
import { applyCaptureIntensities } from "./light-rendering";

export const FEED_WIDTH = 480;
export const FEED_HEIGHT = 270;

export function verticalFieldOfView(focalLengthMm: number, aspect = 16 / 9) {
  return 2 * Math.atan(36 / aspect / (2 * focalLengthMm)) * 180 / Math.PI;
}

export function exposureMultiplier(iso: number, aperture: number, seconds: number) {
  return (iso / 400) * (2.8 / aperture) ** 2 * (seconds / (1 / 125));
}

export type FeedOptics = {
  exposure: number;
  aperture: number;
  focalLengthMm: number;
  focusDistance: number;
};

/** Render in linear HDR, gather a depth-dependent aperture disk, then encode display pixels. */
export class CameraFeedRenderer {
  private readonly colorTarget = new WebGLRenderTarget(FEED_WIDTH, FEED_HEIGHT, {
    type: HalfFloatType,
    depthTexture: new DepthTexture(FEED_WIDTH, FEED_HEIGHT),
  });
  private readonly outputTarget = new WebGLRenderTarget(FEED_WIDTH, FEED_HEIGHT, { depthBuffer: false });
  private readonly material = new ShaderMaterial({
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
    uniforms: {
      tColor: { value: this.colorTarget.texture },
      tDepth: { value: this.colorTarget.depthTexture },
      resolution: { value: new Vector2(FEED_WIDTH, FEED_HEIGHT) },
      nearPlane: { value: 0.05 }, farPlane: { value: 100 },
      focalLength: { value: 0.05 }, focusDistance: { value: 2 },
      fNumber: { value: 2.8 },
      toneMappingExposure: { value: 1 },
    },
    vertexShader: `varying vec2 vUv;
      void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: `
      #include <tonemapping_pars_fragment>
      uniform sampler2D tColor;
      uniform sampler2D tDepth;
      uniform vec2 resolution;
      uniform float nearPlane, farPlane, focalLength, focusDistance, fNumber;
      varying vec2 vUv;
      float distanceAt(vec2 uv) {
        float z = texture2D(tDepth, uv).r;
        return nearPlane * farPlane / (farPlane - z * (farPlane - nearPlane));
      }
      float radiusAt(float distance) {
        // Thin-lens circle of confusion in sensor metres, converted to pixel radius.
        // Defocus follows only from focal length, f-number and focus distance.
        float diameter = focalLength * focalLength * abs(distance - focusDistance)
          / (fNumber * distance * max(focusDistance - focalLength, 0.001));
        return min(12.0, diameter / 0.036 * resolution.x * 0.5);
      }
      void main() {
        float centerDepth = distanceAt(vUv);
        float radius = radiusAt(centerDepth);
        vec3 color = texture2D(tColor, vUv).rgb;
        float weight = 1.0;
        if (radius > 0.25) {
          for (int i = 0; i < 32; i++) {
            float r = sqrt((float(i) + 0.5) / 32.0);
            float angle = float(i) * 2.39996323;
            vec2 uv = clamp(vUv + vec2(cos(angle), sin(angle)) * r * radius / resolution,
              0.5 / resolution, 1.0 - 0.5 / resolution);
            float sampleDepth = distanceAt(uv);
            // Keep sharp foreground silhouettes from bleeding into the background.
            float w = sampleDepth < centerDepth - 0.02
              ? smoothstep(r * radius - 0.5, r * radius + 0.5, radiusAt(sampleDepth)) : 1.0;
            color += texture2D(tColor, uv).rgb * w;
            weight += w;
          }
        }
        gl_FragColor = sRGBTransferOETF(vec4(ACESFilmicToneMapping(color / weight), 1.0));
      }`,
  });
  private readonly geometry = new PlaneGeometry(2, 2);
  private readonly scene = new Scene();
  private readonly screenCamera = new OrthographicCamera();

  constructor() {
    this.scene.add(new Mesh(this.geometry, this.material));
  }

  render(gl: WebGLRenderer, scene: Scene, camera: PerspectiveCamera, optics: FeedOptics, pixels: Uint8Array) {
    const uniforms = this.material.uniforms;
    uniforms.nearPlane.value = camera.near;
    uniforms.farPlane.value = camera.far;
    uniforms.focalLength.value = optics.focalLengthMm / 1000;
    uniforms.focusDistance.value = optics.focusDistance;
    uniforms.fNumber.value = optics.aperture;
    uniforms.toneMappingExposure.value = optics.exposure;
    const previousTarget = gl.getRenderTarget();
    const previousFace = gl.getActiveCubeFace();
    const previousMip = gl.getActiveMipmapLevel();
    const hidden: Object3D[] = [];
    scene.traverse((object) => {
      if (object.visible && ("isTransformControlsRoot" in object || object.type === "TransformControlsGizmo" || object.type === "TransformControlsPlane")) {
        hidden.push(object);
        object.visible = false;
      }
    });
    const restoreIntensities = applyCaptureIntensities(scene);
    try {
      gl.setRenderTarget(this.colorTarget);
      gl.clear();
      gl.render(scene, camera);
      gl.setRenderTarget(this.outputTarget);
      gl.clear();
      gl.render(this.scene, this.screenCamera);
      gl.readRenderTargetPixels(this.outputTarget, 0, 0, FEED_WIDTH, FEED_HEIGHT, pixels);
    } finally {
      hidden.forEach((object) => { object.visible = true; });
      restoreIntensities();
      gl.setRenderTarget(previousTarget, previousFace, previousMip);
    }
  }

  dispose() {
    this.colorTarget.depthTexture?.dispose();
    this.colorTarget.dispose();
    this.outputTarget.dispose();
    this.geometry.dispose();
    this.material.dispose();
  }
}
