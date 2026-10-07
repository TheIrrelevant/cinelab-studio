/**
 * @file face-units.ts
 * @description Facial actions (plan 3.1): the ARKit-style Face Units 01 targets as an expression
 *   (unit id -> 0..1), grouped for the creator, turned into morph weights, plus eye look angles that
 *   rotate the eye bones (the `eyeLook*` units only move the lids). `tongueOut` is left out: the
 *   tongue is helper geometry that the body mesh does not contain.
 * @scope cinelab-studio
 * @depends none
 */

/** Unit id -> amount 0..1; missing = 0. */
export type FaceExpression = Readonly<Record<string, number>>;

type Unit = { id: string; label: string };
export type FaceGroup = { id: string; label: string; units: Unit[] };

const sided = (base: string, label: string): Unit[] => [
  { id: `${base}Left`, label: `${label} left` },
  { id: `${base}Right`, label: `${label} right` },
];

export const FACE_GROUPS: FaceGroup[] = [
  { id: "brows", label: "Brows", units: [...sided("browDown", "Down"), { id: "browInnerUp", label: "Inner up" }, ...sided("browOuterUp", "Outer up")] },
  {
    id: "eyes",
    label: "Eyes",
    units: [
      ...sided("eyeBlink", "Blink"),
      ...sided("eyeWide", "Wide"),
      ...sided("eyeSquint", "Squint"),
      ...sided("eyeLookUp", "Look up"),
      ...sided("eyeLookDown", "Look down"),
      ...sided("eyeLookIn", "Look in"),
      ...sided("eyeLookOut", "Look out"),
    ],
  },
  { id: "cheeks", label: "Cheeks and nose", units: [{ id: "cheekPuff", label: "Puff" }, ...sided("cheekSquint", "Squint"), ...sided("noseSneer", "Sneer")] },
  {
    id: "jaw",
    label: "Jaw",
    units: [{ id: "jawOpen", label: "Open" }, { id: "jawForward", label: "Forward" }, { id: "jawLeft", label: "Left" }, { id: "jawRight", label: "Right" }, { id: "mouthClose", label: "Lips closed" }],
  },
  {
    id: "mouth",
    label: "Mouth",
    units: [
      ...sided("mouthSmile", "Smile"),
      ...sided("mouthFrown", "Frown"),
      ...sided("mouthDimple", "Dimple"),
      ...sided("mouthStretch", "Stretch"),
      ...sided("mouthPress", "Press"),
      ...sided("mouthUpperUp", "Upper lip up"),
      ...sided("mouthLowerDown", "Lower lip down"),
      { id: "mouthPucker", label: "Pucker" },
      { id: "mouthFunnel", label: "Funnel" },
      { id: "mouthLeft", label: "Left" },
      { id: "mouthRight", label: "Right" },
      { id: "mouthRollUpper", label: "Roll upper lip" },
      { id: "mouthRollLower", label: "Roll lower lip" },
      { id: "mouthShrugUpper", label: "Shrug upper" },
      { id: "mouthShrugLower", label: "Shrug lower" },
    ],
  },
];

export const FACE_UNIT_IDS: string[] = FACE_GROUPS.flatMap((group) => group.units.map((unit) => unit.id));

export const faceUnitTarget = (id: string) => `faceunits/${id}`;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** Morph weights (`faceunits/<id>` -> amount) of the non-zero units; unknown ids throw. */
export function faceUnitWeights(expression: FaceExpression | undefined): Map<string, number> {
  const out = new Map<string, number>();
  for (const [id, value] of Object.entries(expression ?? {})) {
    if (!FACE_UNIT_IDS.includes(id)) throw new Error(`Unknown face unit: ${id}`);
    const amount = clamp01(value);
    if (amount > 0) out.set(faceUnitTarget(id), amount);
  }
  return out;
}

/** Degrees at amount 1 (ARKit eye look range, kept inside the eye joint limits). */
export const EYE_LOOK_DEGREES = { horizontal: 30, vertical: 25 } as const;

/** Per eye: yaw > 0 turns towards the character's left (+x), pitch > 0 looks up. */
export type EyeAngles = { left: { yaw: number; pitch: number }; right: { yaw: number; pitch: number } };

export function eyeLookAngles(expression: FaceExpression | undefined): EyeAngles {
  const e = (id: string) => clamp01(expression?.[id] ?? 0);
  const { horizontal, vertical } = EYE_LOOK_DEGREES;
  return {
    // The left eye looks out towards +x, the right eye looks in towards +x.
    left: { yaw: (e("eyeLookOutLeft") - e("eyeLookInLeft")) * horizontal, pitch: (e("eyeLookUpLeft") - e("eyeLookDownLeft")) * vertical },
    right: { yaw: (e("eyeLookInRight") - e("eyeLookOutRight")) * horizontal, pitch: (e("eyeLookUpRight") - e("eyeLookDownRight")) * vertical },
  };
}
