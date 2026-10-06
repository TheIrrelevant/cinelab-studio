---
type: reference
description: Project notes on the Aion 2 character creator (body tab) as a UX reference for the Cinelab Character tab. Not part of the human creator plan; to be applied after the plan is finished.
last-updated: 2026-10-06
last-model: claude-opus-5-5
depends_on: [./human-creator-plan.md]
---

# Aion 2 character creator notes

**Status:** reference only. The human creator plan (`human-creator-plan.md`) is finished first, as
written; these notes are applied afterwards to improve the result. Nothing here changes the plan.

**Source:** a 20 s screen recording of the Aion 2 (game) character creator, body tab, shared by the
product owner on 2026-10-06. The recording only shows the chest and shoulder section being edited.
Observed from frames, not from any code or assets of the game.

## Screen layout

- **Top tabs:** Preset, Face, Hair, Style, Body.
- **Left panel (look and setting):** body type icons (2), skin colour, skin gloss scope (whole body
  or face and body separately), face gloss and body gloss sliders, voice (1-4), outfit preview (4),
  lighting type (3 presets), lighting position as a 2D XY pad.
- **Right panel (body shape):** a vertical icon rail of categories (general, whole body,
  arms/muscle, chest, legs); the selected category shows short collapsible sections:
  - Shoulder / trapezius: shoulder size, trapezius size.
  - Chest / ribcage: chest size, chest length, breast size, upper breast volume, breast position
    as a 2D XY pad.
- **Bottom bar:** undo, redo, randomize, reset, primary "Next" button; hide UI and camera icons.

## Patterns worth borrowing

1. **Region camera.** Choosing a category frames the camera on that body region (close-up on the
   chest); the model turns slightly while editing so the change reads in three quarters and profile.
2. **Step slider.** Slider plus left/right step arrows plus a 0-100 numeric value: coarse and fine
   control in one row.
3. **2D XY pad.** One compact control for two-axis values (position of a region, light position).
4. **Short sections.** Two to five sliders per section; categories instead of one long list.
5. **Global actions always visible.** Undo, redo, randomize and reset in a fixed bottom bar.
6. **Separate gloss for face and body.**
7. **Lighting presets in the creator** so the body is judged under known light.

## Mapping to our data (MakeHuman targets already vendored)

| Aion 2 control | Cinelab source |
|---|---|
| Breast size | `cupSize` (shape model v2) |
| Upper breast volume | `breast/breast-volume-vert-up` / `-down` |
| Breast position (XY pad) | `breast/breast-trans-up` / `-down` (Y), `breast/breast-dist-incr` / `-decr` (X) |
| Chest size / length | `torso/torso-scale-horiz`, `torso/torso-scale-vert`, `torso/measure-bust-circ` |
| Shoulder size | `torso/measure-shoulder-dist` |
| Trapezius size | `torso/torso-vshape`, `torso/torso-muscle-dorsi` (closest available) |

Also available for later: `torso/measure-waist-circ`, `measure-hips-circ`, `measure-underbust-circ`
(typed girths in cm, and wider mass range together with muscle - see plan 2.3 finding).

## Out of scope

Voice selection and outfit preview. Visual fidelity (dense mesh, advanced skin shading) is covered
by plan 2.7 and 2.8, not by these notes.

## Candidate improvements after the plan

- Character tab: category icon rail, region camera presets per category, step slider component,
  XY pad component, randomize and reset in a bottom bar.
- Appearance: separate face/body gloss.
- Studio integration: lighting presets and XY light position inside the creator.
