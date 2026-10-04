/**
 * @file materials.ts
 * @description Browser materials for the MakeHuman body: a skin texture blended on a canvas from
 *   the six young skins, plus eye, hair, eyebrow and eyelash materials. Textures use glTF UV
 *   orientation (flipY = false) and sRGB colour space.
 * @scope cinelab-studio
 * @depends three, ./appearance
 */

import {
  CanvasTexture,
  Color,
  DoubleSide,
  ImageLoader,
  MeshStandardMaterial,
  SRGBColorSpace,
  type Texture,
  TextureLoader,
} from "three";
import { skinToneFactor } from "./appearance";

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
    this.texture.needsUpdate = true;
  }
}

export function createSkinMaterial(map: Texture): MeshStandardMaterial {
  return new MeshStandardMaterial({ name: "skin", map, roughness: 0.62, metalness: 0 });
}

export function setSkinTone(material: MeshStandardMaterial, tone: number) {
  material.color.setScalar(skinToneFactor(tone));
}

export function createEyeMaterial(): MeshStandardMaterial {
  return new MeshStandardMaterial({ name: "eyes", roughness: 0.15, metalness: 0 });
}

/** Hair and eyebrows: greyscale/white texture tinted by `color`; alpha-tested strands. */
export function createTintedMaterial(name: string, alphaTest: number): MeshStandardMaterial {
  return new MeshStandardMaterial({ name, roughness: 0.55, metalness: 0, side: DoubleSide, alphaTest, transparent: false });
}

export function createEyelashMaterial(): MeshStandardMaterial {
  return new MeshStandardMaterial({ name: "eyelashes", color: new Color("#111111"), side: DoubleSide, alphaTest: 0.3, roughness: 0.8 });
}
