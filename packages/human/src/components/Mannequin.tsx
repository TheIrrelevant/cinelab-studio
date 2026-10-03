/**
 * @file Mannequin.tsx
 * @description Jointed placeholder human figure scaled by a MannequinSpec and posed by preset.
 * @scope cinelab-studio
 * @depends @react-three/fiber, poses, mannequin-spec
 */

"use client";

import { poseAngles, type PoseId } from "../poses";
import type { MannequinSpec } from "../mannequin-spec";

function Limb({
  position,
  length,
  radius,
  color,
}: {
  position: [number, number, number];
  length: number;
  radius: number;
  color: string;
}) {
  return (
    <mesh position={position} castShadow>
      <capsuleGeometry args={[radius, Math.max(length - radius * 2, 0.01), 8, 16]} />
      <meshStandardMaterial color={color} roughness={0.62} />
    </mesh>
  );
}

function Hair({ spec, headY, headRadius }: { spec: MannequinSpec; headY: number; headRadius: number }) {
  const material = <meshStandardMaterial color={spec.hairColor} roughness={0.85} />;
  if (spec.hair === "none") return null;
  const cap = (
    <mesh position={[0, headY + headRadius * 0.12, -headRadius * 0.05]} scale={[1.06, 1.02, 1.08]} castShadow>
      <sphereGeometry args={[headRadius, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
      {material}
    </mesh>
  );
  if (spec.hair === "cap") return cap;
  if (spec.hair === "curly") {
    return (
      <mesh position={[0, headY + headRadius * 0.2, -headRadius * 0.08]} scale={[1.25, 1.15, 1.25]} castShadow>
        <sphereGeometry args={[headRadius, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
        {material}
      </mesh>
    );
  }
  if (spec.hair === "bun") {
    return (
      <>
        {cap}
        <mesh position={[0, headY + headRadius * 0.55, -headRadius * 0.85]} castShadow>
          <sphereGeometry args={[headRadius * 0.45, 16, 12]} />
          {material}
        </mesh>
      </>
    );
  }
  const length = spec.hair === "long" ? headRadius * 3.4 : headRadius * 1.6;
  return (
    <>
      {cap}
      <mesh position={[0, headY - length / 2 + headRadius * 0.6, -headRadius * 0.45]} castShadow>
        <boxGeometry args={[headRadius * 2.1, length, headRadius * 0.9]} />
        {material}
      </mesh>
    </>
  );
}

const toRadians = (angles: [number, number, number]) =>
  angles.map((value) => (value * Math.PI) / 180) as [number, number, number];

/** Two-segment limb hanging along -y from its pivot, with a bend joint between the segments. */
function JointedLimb({
  pivot,
  rotation,
  bend,
  upperLength,
  lowerLength,
  radius,
  upperColor,
  lowerColor,
  end,
}: {
  pivot: [number, number, number];
  rotation: [number, number, number];
  bend: [number, number, number];
  upperLength: number;
  lowerLength: number;
  radius: number;
  upperColor: string;
  lowerColor: string;
  end: "hand" | "foot";
}) {
  return (
    <group position={pivot} rotation={toRadians(rotation)}>
      <Limb position={[0, -upperLength / 2, 0]} length={upperLength} radius={radius} color={upperColor} />
      <group position={[0, -upperLength, 0]} rotation={toRadians(bend)}>
        <Limb position={[0, -lowerLength / 2, 0]} length={lowerLength} radius={radius * 0.9} color={lowerColor} />
        {end === "hand" ? (
          <mesh position={[0, -lowerLength - radius * 0.6, 0]} castShadow>
            <sphereGeometry args={[radius * 1.1, 12, 10]} />
            <meshStandardMaterial color={lowerColor} roughness={0.55} />
          </mesh>
        ) : (
          <mesh position={[0, -lowerLength - radius * 0.2, radius * 1.4]} castShadow>
            <boxGeometry args={[radius * 1.8, radius * 1.1, radius * 4.2]} />
            <meshStandardMaterial color="#141516" roughness={0.6} />
          </mesh>
        )}
      </group>
    </group>
  );
}

/** Jointed figure scaled from the character's body, skin and hair settings, posed by preset. */
export function Mannequin({ spec, pose, selected }: { spec: MannequinSpec; pose: PoseId; selected: boolean }) {
  const angles = poseAngles(pose);
  const unit = spec.height / 1.72;
  const thigh = 0.44 * unit;
  const shin = 0.4 * unit;
  const hipY = thigh + shin + 0.04 * unit;
  const torsoLength = 0.56 * unit;
  const shoulderLocalY = torsoLength - 0.04 * unit;
  const headRadius = 0.11 * unit;
  const hipHalf = 0.1 * spec.girth * unit;
  const shoulderHalf = 0.19 * spec.shoulderRatio * spec.girth * unit;
  const limb = 0.055 * spec.girth * unit;
  const clothing = selected ? "#3a3326" : "#2b2d30";

  return (
    <group>
      <JointedLimb pivot={[-hipHalf, hipY, 0]} rotation={angles.leftHip} bend={angles.leftKnee} upperLength={thigh} lowerLength={shin} radius={limb * 1.15} upperColor={clothing} lowerColor={clothing} end="foot" />
      <JointedLimb pivot={[hipHalf, hipY, 0]} rotation={angles.rightHip} bend={angles.rightKnee} upperLength={thigh} lowerLength={shin} radius={limb * 1.15} upperColor={clothing} lowerColor={clothing} end="foot" />
      <group position={[0, hipY, 0]} rotation={toRadians(angles.spine)}>
        <mesh position={[0, torsoLength / 2, 0]} scale={[shoulderHalf * 2, torsoLength, 0.22 * spec.girth * unit]} castShadow>
          <capsuleGeometry args={[0.5, 0.3, 8, 16]} />
          <meshStandardMaterial color={clothing} roughness={0.7} />
        </mesh>
        <JointedLimb pivot={[-(shoulderHalf + limb), shoulderLocalY, 0]} rotation={angles.leftShoulder} bend={angles.leftElbow} upperLength={0.31 * unit} lowerLength={0.28 * unit} radius={limb} upperColor={clothing} lowerColor={spec.skin} end="hand" />
        <JointedLimb pivot={[shoulderHalf + limb, shoulderLocalY, 0]} rotation={angles.rightShoulder} bend={angles.rightElbow} upperLength={0.31 * unit} lowerLength={0.28 * unit} radius={limb} upperColor={clothing} lowerColor={spec.skin} end="hand" />
        <group position={[0, torsoLength + 0.02 * unit, 0]} rotation={toRadians(angles.head)}>
          <Limb position={[0, 0.04 * unit, 0]} length={0.12 * unit} radius={0.045 * unit} color={spec.skin} />
          <mesh position={[0, 0.07 * unit + headRadius, 0]} scale={[0.92, 1.08, 1]} castShadow>
            <sphereGeometry args={[headRadius, 24, 16]} />
            <meshStandardMaterial color={spec.skin} roughness={0.55} />
          </mesh>
          <mesh position={[0, 0.07 * unit + headRadius * 0.9, headRadius * 0.95]} castShadow>
            <coneGeometry args={[headRadius * 0.16, headRadius * 0.35, 8]} />
            <meshStandardMaterial color={spec.skin} roughness={0.55} />
          </mesh>
          <Hair spec={spec} headY={0.07 * unit + headRadius} headRadius={headRadius} />
        </group>
      </group>
    </group>
  );
}
