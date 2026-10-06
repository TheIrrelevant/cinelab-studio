---
type: asset-source
description: Provenance of the vendored MakeHuman system assets (CC0).
---

# MakeHuman system assets (CC0)

- Source: https://files2.makehumancommunity.org/asset_packs/makehuman_system_assets/makehuman_system_assets_cc0.zip
- SHA-256 of the zip: `b542127a8e25547c7c29c19f2d1d2adb9a664c80396ecd694095dbc8028a0107`
- License: CC0 1.0 (asset pack page and file headers; see `LICENSE.ASSETS.md`).
- Copied: {"skins":6,"eyeColours":10,"eyebrows":12,"eyelashes":4,"hair":10}.
- Skins resized to 1024 JPEG; hair, eyebrow and eye textures resized. For runtime tinting hair
  is greyscale normalised to mean 0.75 / std 0.18 and eyebrows are white; alpha is kept.
  `eyes/colours/darkbrown.png` is derived from `brown.png` (hue +18, saturation 0.7) because the
  stock brown iris reads maroon.
  Meshes and .mhclo files are unchanged.
- One-time snapshot. Regenerate with `node tools/vendor-makehuman-system.mjs`.
