/**
 * @file materials.ts
 * @description Browser materials for the MakeHuman body: a skin texture blended on a canvas from
 *   the six young skins (face band flattened, plan 2.7) with a tiled micro-normal, plus eye, hair,
 *   eyebrow and eyelash materials (soft alpha-to-coverage strand edges, matte hair). Textures use
 *   glTF UV orientation (flipY = false) and sRGB colour space.
 * @scope cinelab-studio
 * @depends three, ./appearance, ./skin-detail
 */

import {
  CanvasTexture,
  Color,
  DataTexture,
  DoubleSide,
  ImageLoader,
  MeshStandardMaterial,
  RepeatWrapping,
  SRGBColorSpace,
  Vector2,
  type Texture,
  TextureLoader,
} from "three";
import { skinToneFactor } from "./appearance";
import { detailNormalPixels, FACE_REGION, flattenLowFrequency } from "./skin-detail";

const textureCache = new Map<string, Promise<Texture>>();

export function loadTexture(url: string, srgb = true): Promise<Texture> {
  let texture = textureCache.get(url);
  if (!texture) {
    texture = new TextureLoader().loadAsync(url).then((loaded) => {
      loaded.flipY = false;
      if (srgb) loaded.colorSpace = SRGBColorSpace;
      loaded.anisotropy = 4;
      return loaded;
    });
    textureCache.set(url, texture);
  }
  return texture;
}

/** Blends skin images by weight on one canvas: a running weighted average via globalAlpha. */
export class SkinCompositor {
  readonly texture: CanvasTexture;
  private readonly canvas: HTMLCanvasElement;
  private images = new Map<string, HTMLImageElement>();
  private lastKey = "";

  constructor(size = 1024) {
    this.canvas = document.createElement("canvas");
    this.canvas.width = size;
    this.canvas.height = size;
    this.texture = new CanvasTexture(this.canvas);
    this.texture.flipY = false;
    this.texture.colorSpace = SRGBColorSpace;
  }

  async load(baseUrl: string, names: string[]) {
    const loader = new ImageLoader();
    const loaded = await Promise.all(names.map(async (name) => [name, await loader.loadAsync(`${baseUrl}skins/${name}.jpg`)] as const));
    this.images = new Map(loaded);
  }

  /** Redraws only when the rounded weights change. */
  update(weights: Map<string, number>) {
    const entries = [...weights].filter(([name, w]) => w > 0 && this.images.has(name));
    const key = entries.map(([name, w]) => `${name}:${w.toFixed(3)}`).join("|");
    if (key === this.lastKey || entries.length === 0) return;
    this.lastKey = key;
    const context = this.canvas.getContext("2d");
    if (!context) return;
    let total = 0;
    for (const [name, weight] of entries) {
      total += weight;
      context.globalAlpha = weight / total;
      context.drawImage(this.images.get(name)!, 0, 0, this.canvas.width, this.canvas.height);
    }
    context.globalAlpha = 1;
    this.flattenFace(context);
    this.texture.needsUpdate = true;
  }

  /** Removes the painted light band on the face (see skin-detail.ts). */
  private flattenFace(context: CanvasRenderingContext2D) {
    const { width, height } = this.canvas;
    const x = Math.round(FACE_REGION.x0 * width);
    const y = Math.round(FACE_REGION.y0 * height);
    const w = Math.round(FACE_REGION.x1 * width) - x;
    const h = Math.round(FACE_REGION.y1 * height) - y;
    const block = context.getImageData(x, y, w, h);
    flattenLowFrequency(block.data, w, h, Math.round(width / 40), 0.7);
    context.putImageData(block, x, y);
  }
}

let detailNormal: DataTexture | null = null;

/** Shared tiled micro-normal for the skin (created once). */
function skinDetailNormal(): DataTexture {
  if (!detailNormal) {
    detailNormal = new DataTexture(detailNormalPixels(256), 256, 256);
    detailNormal.wrapS = RepeatWrapping;
    detailNormal.wrapT = RepeatWrapping;
    detailNormal.repeat.set(20, 20);
    detailNormal.flipY = false;
    detailNormal.needsUpdate = true;
  }
  return detailNormal;
}

export function createSkinMaterial(map: Texture): MeshStandardMaterial {
  return new MeshStandardMaterial({ name: "skin", map, roughness: 0.58, metalness: 0, normalMap: skinDetailNormal(), normalScale: new Vector2(0.18, 0.18) });
}

export function setSkinTone(material: MeshStandardMaterial, tone: number) {
  material.color.setScalar(skinToneFactor(tone));
}

/** Eyes sit in the lid shadow; a little self-light from their own texture keeps the whites white. */
export function createEyeMaterial(): MeshStandardMaterial {
  return new MeshStandardMaterial({ name: "eyes", roughness: 0.2, metalness: 0, emissive: new Color("#ffffff"), emissiveIntensity: 0.18 });
}

/** Hair and eyebrows: greyscale/white texture tinted by `color`; matte, soft-edged strands. */
export function createTintedMaterial(name: string, alphaTest: number): MeshStandardMaterial {
  return new MeshStandardMaterial({ name, roughness: 0.82, metalness: 0, side: DoubleSide, alphaTest, alphaToCoverage: true, transparent: false });
}

export function createEyelashMaterial(): MeshStandardMaterial {
  return new MeshStandardMaterial({ name: "eyelashes", color: new Color("#111111"), side: DoubleSide, alphaTest: 0.3, alphaToCoverage: true, roughness: 0.8 });
}
