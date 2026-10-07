/**
 * @file human-schema.ts
 * @description Character data v2 (plan 2.9): the MakeHuman part of a character - phenotype and local
 *   modifiers (`shape`), appearance, the locked size (typed cm/kg) and the pose (bone -> quaternion
 *   [x, y, z, w], plus the root offset in metres) and the facial expression (plan 3.1, face unit ->
 *   0..1). Validated with zod like the rest of the character.
 * @scope cinelab-studio
 * @depends zod, @cinelab/human (macro, body-types, shape-model, appearance, face-units)
 */

import { z } from "zod";
import { DEFAULT_APPEARANCE, type Appearance } from "@cinelab/human/makehuman/appearance";
import { BODY_TYPE_IDS } from "@cinelab/human/makehuman/body-types";
import { MAX_AGE_YEARS, MIN_AGE_YEARS } from "@cinelab/human/makehuman/macro";
import { DEFAULT_SHAPE, type ShapeParams } from "@cinelab/human/makehuman/shape-model";
import { FACE_UNIT_IDS } from "@cinelab/human/makehuman/face-units";

const unit = z.number().min(0).max(1);
const hexColor = /^#[0-9a-fA-F]{6}$/;

export const HumanShapeSchema = z.object({
  gender: unit,
  ageYears: z.number().min(MIN_AGE_YEARS).max(MAX_AGE_YEARS),
  muscle: unit,
  weight: unit,
  height: unit,
  proportions: unit,
  african: unit,
  asian: unit,
  caucasian: unit,
  cupSize: unit,
  firmness: unit,
  modifiers: z.record(z.string().min(1), z.number().min(-1).max(1)),
  bodyType: z.object({ id: z.enum(BODY_TYPE_IDS), intensity: unit }),
});

export const AppearanceSchema = z.object({
  skinTone: unit,
  eyeColour: z.string().min(1),
  hair: z.string().min(1).nullable(),
  hairColour: z.string().regex(hexColor, "hairColour must be a #rrggbb hex"),
  eyebrows: z.string().min(1).nullable(),
  eyelashes: z.string().min(1).nullable(),
});

export const BodySizeSchema = z.object({ heightCm: z.number().positive(), massKg: z.number().positive() });

const quaternion = z.tuple([z.number(), z.number(), z.number(), z.number()]);

export const HumanSchema = z.object({
  shape: HumanShapeSchema,
  appearance: AppearanceSchema,
  /** Typed size the creator keeps; null = take the measured size of the shape. */
  size: BodySizeSchema.nullable(),
  /** Rig bone name -> rotation delta from the rest frame. Empty = rest pose. */
  pose: z.record(z.string().min(1), quaternion),
  rootOffset: z.tuple([z.number(), z.number(), z.number()]),
  /** Face unit id -> 0..1 (plan 3.1); characters saved before it have none. */
  expression: z
    .record(z.string(), unit)
    .refine((value) => Object.keys(value).every((id) => FACE_UNIT_IDS.includes(id)), "Unknown face unit")
    .default({}),
});

export type HumanShape = Required<ShapeParams>;
export type Human = z.infer<typeof HumanSchema>;

/** A complete human for a shape and appearance (rest pose, size from the body). */
export function createHuman(shape: HumanShape = DEFAULT_SHAPE, appearance: Appearance = DEFAULT_APPEARANCE): Human {
  return HumanSchema.parse({ shape, appearance, size: null, pose: {}, rootOffset: [0, 0, 0], expression: {} });
}
