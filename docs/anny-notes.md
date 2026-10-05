---
type: reference
description: What Cinelab adapts from naver/anny (Apache 2.0), what it only references, and what it skips - with file references, formulas and license notes. Human creator plan step 0.2.
last-updated: 2026-10-05
last-model: claude-opus-5-5
depends_on: [./human-creator-plan.md, ../NOTICE, ../packages/human/src/makehuman/macro.ts]
---

# Anny notes

Source: [naver/anny](https://github.com/naver/anny) at commit `d6fc027ced5c17b6b0775dee944096ade7a9ef80`
(2026-09-28). Paths are relative to `src/anny/` unless they start with `scripts/`.

Rule: we re-implement in TypeScript; no Anny code is copied. Every ADAPT row is credited in `NOTICE`.
Data we need is vendored from MakeHuman (CC0), not from the Anny repo.

## 1. Licenses and provenance

| Item | License | Use |
|---|---|---|
| Anny code (`*.py`, header "Copyright (C) 2025 NAVER Corp.") | Apache 2.0 | adapt with attribution |
| `data/mpfb2/` (hm08 mesh, targets, rigs, weights) | CC0 | same data we already vendor from MakeHuman |
| `data/faceunits01/` (Face Units 01, Mika Suominen) | CC0 | vendor from MakeHuman in plan 3.1 |
| `data/mpfb2/rigs/standard/weights.default.json` (Anny-cleaned MakeHuman weights) | Apache 2.0 (derived from CC0) | optional in 1.6, with attribution |
| `data/cached/anny.pth` (orientation caches) | Apache 2.0 | not usable: keyed to Anny's 104-bone rig and blendshape labels |
| `data/shape_calibration/{boys,girls}.pth` | no data license note | skip |
| `smplx` / `smpl` topology, `models/smpl.py` | non-commercial | never use |

No AGPL or GPL code found.

## 2. Compatibility with our body

- Mesh: Anny's `data/mpfb2/3dobjs/base.obj` is full hm08 (19,158 vertices); the body group is vertices
  1..13380, the same as ours. Tongue 13381-13606, then joint helper cubes and eye helpers.
- Anny's default `anny` topology edits the mesh (removes vertices 1778-1793 and 8450-8465, closes the
  holes, adds eye and tongue faces, triangulates; `models/full_model.py:849 get_edited_mesh_faces`)
  and keeps `base_mesh_vertex_indices` to map back to hm08. We stay on plain hm08.
- Rig: `rig="makehuman"` is the same 163-bone `rig.default.json`, same bone names, root `root`.
  Anny's default rig is a 104-bone pruned variant (`models/model_data.py` ~521).
- Coordinates: Anny world = `0.1 * RotX(90 deg)` of MakeHuman data, i.e. metres, Z-up (Blender).
  three.js is Y-up: Blender +Y equals three.js -Z. This matters for bone roll (section 5).

## 3. Phenotype weighting - `models/phenotype.py`, `utils/interpolation.py`, `models/model_data.py:40`

**Scheme.** Per variable, `linear_interpolation_coefficients` (`utils/interpolation.py:7`) clamps the
value to the anchor range, finds the bracketing anchors and returns `1 - alpha` / `alpha`. Anchors come
from `_make_phenotype_anchors` (`models/phenotype.py:187`). A target's weight is the product over the
categories in its key, computed as `prod(phens * mask + (1 - mask))` with a precomputed 0/1 mask.
Race weights are `v_r / sum(v)`, falling back to 1/3 each. Same Cartesian product as our `macro.ts`.

**Target blocks** (`models/full_model.py:86 load_macrodetails`): universal g x a x m x w; race r x g x a;
height g x a x m x w x h; proportions g x a x m x w x p; breast female x a x m x w x cup x firm (only where
the file exists).

**Local modifiers** (`models/full_model.py:290 load_all_blendshapes`): each `target.json` modifier with
opposites becomes a pair; value `v` in [-1, 1] gives `ReLU(v)` on the increase target and `ReLU(-v)` on
the decrease target, per side. Purely additive, not scaled by macros.

**Differences from our model** (must not leak in, plan 2.2 AC requires identical shared parameters):

| Parameter | Anny | Ours (MakeHuman-faithful) |
|---|---|---|
| gender | 0 = male, 1 = female | 0 = female, 1 = male |
| height, proportions | two anchors; 0.5 applies half of min and half of max | one-sided; 0.5 applies nothing |
| proportions direction | 0 = ideal | 1 = ideal |
| age | anchors [-1/3, 0, 1/3, 2/3, 1]; 2/3 = 25 y | MakeHuman age curve, adults only |

| Decision | Plan step |
|---|---|
| ADAPT breast block (cup size, firmness) and mask-product formulation | 2.1, 2.2 |
| ADAPT opposite-pair modifiers with ReLU coefficients | 2.1, 2.2 |
| REFERENCE ONLY gender, age, height, proportions curves (keep ours) | 2.2 |
| SKIP newborn synthesis from baby targets (adults only) | - |

## 4. Anthropometry - `anthropometry.py`

Rest (unposed) vertices, metres:

- `height` (:76): max minus min along the up axis over all output vertices; no landmarks.
- `waist_circumference` (:82): closed polyline through the 46 hm08 vertex indices in
  `BASE_MESH_WAIST_VERTICES` (:6), summing segment lengths with wrap-around. Indices are original hm08
  indices, so they apply to our body directly.
- `volume` (:90): divergence theorem, `|sum over triangles of (v0 x v1) . v2 / 6|`.
- `mass` (:102): `volume * 980` (kg/m3).
- `bmi` (:108): `mass / height^2`.

Caveat: hm08 is not watertight (eye sockets, mouth). Anny ignores this; we triangulate quads and either
cap the holes or measure with a fixed origin (pelvis) so the result does not depend on placement.

Decision: ADAPT all five measurements for plan 2.3, credited in `NOTICE`.

## 5. Bone frames and skinning - `models/rigged_model.py`, `utils/kinematics.py`, `models/model_transforms.py`

**Joint regressors** (`models/full_model.py:478 load_rig`, `:243 _get_coordinates_regressor`). Head and
tail positions come from `rig.default.json` strategies: `VERTEX` (one vertex), `CUBE` (mean of the 8
vertices of a `joint-*` helper cube, indices above 13380), `MEAN` (mean of listed vertices). Joints are
therefore linear in the blendshape weights; Anny precomputes per-target head/tail deltas. For us: the
helper-cube vertices must keep morphing (or we precompute the same deltas) for the refit to stay exact.

**Tail and roll frame** (`utils/kinematics.py:302 get_bone_poses`, used by
`models/rigged_model.py:279 _get_tail_rest_model`):

```
y     = normalize(tail - head)
axis  = normalize(cross(y, Y_ref))       # Y_ref = Blender +Y in the Z-up frame
angle = atan2(|cross(y, Y_ref)|, dot(y, Y_ref))
R     = rotvec(-angle * axis) * RotY(roll)
if y is anti-parallel to Y_ref: R = diag(1, -1, -1)
T     = head; the root bone keeps identity rotation
```

Compute in the Z-up frame and convert to Y-up afterwards, otherwise rolls are wrong.
Decision: ADAPT for plan 1.1.

**Cached Procrustes orientation** (`models/rigged_model.py:370 _get_cached_rest_model`,
`scripts/precompute_rig_caches.py:14 compute_cached_orientation_data`). Anny warns that tail and roll
frames are inconsistent across shapes (`scripts/precompute_rig_caches.py:294`). Per bone it keeps a 3x3
matrix `M = M0 + sum_a c_a * dM_a` (weighted cross-covariance of skinned vertex offsets from the bone head
against the reference shape, weights = squared skin weights, plus a tail-aim term of weight 0.5) and
takes `R = special_procrustes(M)` (SVD with determinant fix). Cost at runtime: one 3x3 SVD per bone.
Decision: REFERENCE, ADAPT only as a roll fix if 1.1 shows twist or flips. A Procrustes frame does not
keep local Y exactly on the tail, which conflicts with the 1.1 AC, so we would use it to correct roll
only. `M0` and `dM` must be computed offline from our own target set.

**Kinematics** (`utils/kinematics.py:60 forward_kinematic`): `pose_i = pose_parent * rest_i * delta_i`,
`transform_i = pose_i * inverse(rest_i)`, then linear blend skinning. This equals three.js `Skeleton`
with `boneInverses = inverse(rest)`. Decision: REFERENCE ONLY (1.4 local and world gizmo modes).

**Skinning weights** (`models/model_transforms.py:235 symmetrize_skinning_weights`,
`:274 remove_skinning_islands`). Mirror left and right weights, drop disconnected islands.
Decision: ADAPT the two passes in plan 1.6 if our QA poses need them.

## 6. Parameter inversion - `anny_inverter.py`

Inverts a target **mesh** into pose and phenotype; it never takes height or weight. `_fit_iterative`
(:539) alternates a per-bone weighted Kabsch pose fit with a damped Gauss-Newton shape step:
central-difference Jacobian (`_compute_macro_jacobian` :281, eps 0.1, values kept in [0.01, 0.99]),
`delta = (A^T A + diag(lambda))^-1 A^T r`, each step clamped to +-0.1, 10 iterations by default.
Regularisation (`_DEFAULT_REG_WEIGHT_KWARGS` :20): height 1e-3, gender, muscle, weight, proportions 1,
cup size and firmness 2, age 10, ethnicities 100.

**Our 2.3 solver** (adapted pattern): forward model `f(p) = [height(p), mass(p)]` from our CPU morph;
start with 1-D bisection on `height` and `weight`, then 2-3 coupled damped Newton steps on the 2x2
system with a central-difference Jacobian; parameters clamped to [0, 1], steps to +-0.1, every other
parameter fixed. Feasible range: evaluate the corners of (height, weight) in {0, 1}^2, and for a typed
height bisect `weight` for min and max kg.

| Decision | Plan step |
|---|---|
| ADAPT damped Gauss-Newton update with finite-difference Jacobian and clamps | 2.3, 2.4 |
| REFERENCE ONLY Kabsch pose fit, multistart anchors, Adam post-fit, WHO Beta prior | - |
| SKIP `examples/mesh_to_params.py` (presets around the inverter) | - |

## 7. Facial actions - `models/facial_actions.py`

`FACIAL_ACTION_LABELS` (:13) lists the 52 ARKit names in alphabetical order (`browDownLeft` ...
`tongueOut`). Data are the 52 CC0 Face Units `.target` files (`vid dx dy dz` per line, hm08 indexing,
`#` comments) loaded by `load_plain_target` (:69). They are pure additive blendshapes applied before
skinning, with no clamping or mutual exclusion in the forward pass. Eye look and blink move hm08 eye
helper and lid vertices, so our eyes must be morphed through the same vertex mapping or use a gaze bone.
Tongue actions touch vertices 13380-13605.

Decision: ADAPT for plan 3.1. Vendor the targets from the MakeHuman Face Units 01 pack, keep the
alphabetical label order as our API order, clamp UI values to [0, 1], optional left/right exclusivity
for eye look.

## 8. Consequences for the plan

- 1.1: tail and roll frame in Z-up, then convert; helper cubes must keep morphing. Open decision D6:
  if roll is unstable across shapes, keep local Y on the tail and correct only roll with Procrustes.
- 2.2: keep MakeHuman curves; add Anny-style breast block and ReLU modifier pairs.
- 2.3: measurements from section 4 and the solver from section 6; waist uses Anny's 46 indices.
- 3.1: Face Units from MakeHuman, additive before skinning.
