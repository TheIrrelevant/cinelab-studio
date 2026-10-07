/**
 * @file body-controller.ts
 * @description Drives a loaded MakeHuman body in the browser: shape (morph + skeleton refit),
 *   skin texture blend and tone, eyes, and the optional hair / eyebrow / eyelash proxies, which
 *   are created on demand, re-fitted on every shape change and share the body skeleton.
 * @scope cinelab-studio
 * @depends three, ./face-units, ./body-shape, ./appearance, ./materials, ./proxy-data, ./load-body, ./shape-model
 */

import type { MeshStandardMaterial, SkinnedMesh } from "three";
import { skinWeights, type Appearance } from "./appearance";
import { applyBodyShape, applyExpression, type BodyShapeResult } from "./body-shape";
import type { FaceExpression } from "./face-units";
import type { LoadedBody } from "./load-body";
import type { ShapeParams } from "./shape-model";
import {
  createEyeMaterial,
  createEyelashMaterial,
  createSkinMaterial,
  createTintedMaterial,
  loadTexture,
  setSkinTone,
  SkinCompositor,
} from "./materials";
import { createProxyMesh, fitProxyMesh, proxyKey } from "./proxy-data";

type Slot = "eyes" | "eyebrows" | "eyelashes" | "hair";

export class BodyController {
  private readonly skin = new SkinCompositor();
  private readonly skinMaterial: MeshStandardMaterial;
  private readonly slots = new Map<Slot, { name: string; mesh: SkinnedMesh; material: MeshStandardMaterial }>();
  /** Rendered (expressed) surface that proxies fit to. */
  private source: Float32Array | null = null;
  /** Shaped source without expression. */
  private shaped: Float32Array | null = null;
  private appearanceVersion = 0;

  constructor(private readonly body: LoadedBody, private readonly baseUrl: string) {
    this.skinMaterial = createSkinMaterial(this.skin.texture);
    body.mesh.material = this.skinMaterial;
  }

  /** Loads the skin images; call once before the first render. */
  async init() {
    await this.skin.load(this.baseUrl, this.body.proxyManifest.skins);
  }

  setShape(params: ShapeParams, expression?: FaceExpression): BodyShapeResult {
    const result = applyBodyShape(this.body.mesh, this.body.data, params, expression);
    this.shaped = result.source;
    this.source = result.surface;
    this.skin.update(skinWeights(params));
    for (const [slot, entry] of this.slots) this.refit(slot, entry.mesh);
    return result;
  }

  /** Changes only the expression on the shaped body (plan 3.1); proxies follow the surface. */
  setExpression(expression: FaceExpression | undefined) {
    if (!this.shaped) return;
    this.source = applyExpression(this.body.mesh, this.body.data, this.shaped, expression);
    for (const [slot, entry] of this.slots) this.refit(slot, entry.mesh);
  }

  /** Applies appearance; later calls supersede earlier ones that are still loading textures. */
  async setAppearance(appearance: Appearance) {
    const version = ++this.appearanceVersion;
    setSkinTone(this.skinMaterial, appearance.skinTone);
    this.ensureSlot("eyes", "low-poly", createEyeMaterial);
    this.ensureSlot("hair", appearance.hair, () => createTintedMaterial("hair", 0.45));
    this.ensureSlot("eyebrows", appearance.eyebrows, () => createTintedMaterial("eyebrows", 0.2));
    this.ensureSlot("eyelashes", appearance.eyelashes, createEyelashMaterial);
    const hair = this.slots.get("hair");
    hair?.material.color.set(appearance.hairColour);
    this.slots.get("eyebrows")?.material.color.set(appearance.hairColour).multiplyScalar(0.75);
    await Promise.all([
      this.applyTexture("eyes", `${this.baseUrl}eyes/${appearance.eyeColour}.png`, version),
      ...(["hair", "eyebrows", "eyelashes"] as const).map((slot) => this.applyProxyTextures(slot, version)),
    ]);
  }

  dispose() {
    for (const slot of [...this.slots.keys()]) this.removeSlot(slot);
    this.skinMaterial.dispose();
    this.skin.texture.dispose();
  }

  private ensureSlot(slot: Slot, name: string | null, material: () => MeshStandardMaterial) {
    const current = this.slots.get(slot);
    if (current?.name === name) return;
    if (current) this.removeSlot(slot);
    if (!name) return;
    const data = this.body.proxies.get(proxyKey(slot, name));
    if (!data) throw new Error(`Unknown ${slot}: ${name}`);
    const mesh = createProxyMesh(data, this.body.mesh.skeleton, this.body.mesh.bindMatrix, material());
    this.body.mesh.parent?.add(mesh);
    this.slots.set(slot, { name, mesh, material: mesh.material as MeshStandardMaterial });
    this.refit(slot, mesh);
  }

  private removeSlot(slot: Slot) {
    const entry = this.slots.get(slot);
    if (!entry) return;
    entry.mesh.removeFromParent();
    entry.mesh.geometry.dispose();
    entry.material.dispose();
    this.slots.delete(slot);
  }

  private refit(slot: Slot, mesh: SkinnedMesh) {
    if (!this.source) return;
    const entry = this.slots.get(slot);
    const data = entry && this.body.proxies.get(proxyKey(slot, entry.name));
    if (!data) return;
    fitProxyMesh(mesh, data, this.source);
    mesh.bind(this.body.mesh.skeleton, this.body.mesh.bindMatrix);
  }

  private async applyProxyTextures(slot: Slot, version: number) {
    const entry = this.slots.get(slot);
    const data = entry && this.body.proxies.get(proxyKey(slot, entry.name));
    if (!entry || !data) return;
    const folder = `${this.baseUrl}proxies/${slot}/${entry.name}/`;
    const { diffuse, normal } = data.info.textures;
    await Promise.all([
      diffuse ? this.applyTexture(slot, folder + diffuse, version) : null,
      normal ? this.applyTexture(slot, folder + normal, version, "normalMap") : null,
    ]);
  }

  private async applyTexture(slot: Slot, url: string, version: number, key: "map" | "normalMap" = "map") {
    const name = this.slots.get(slot)?.name;
    const texture = await loadTexture(url, key === "map");
    const entry = this.slots.get(slot);
    // Skip if a newer appearance or a different proxy took this slot while loading.
    if (version !== this.appearanceVersion || !entry || entry.name !== name) return;
    entry.material[key] = texture;
    // Eyes light themselves with their own texture (see createEyeMaterial).
    if (slot === "eyes" && key === "map") entry.material.emissiveMap = texture;
    entry.material.needsUpdate = true;
  }
}
