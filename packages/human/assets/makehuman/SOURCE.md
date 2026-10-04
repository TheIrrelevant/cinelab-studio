---
type: asset-source
description: Provenance of the vendored MakeHuman CC0 assets.
---

# MakeHuman assets (CC0)

- Source: https://github.com/makehumancommunity/mpfb2.git (`src/mpfb/data`), commit `d0a32e57a7f915cb2f2b95410e2117648c7bbb7e`.
- License: CC0 1.0 (see `LICENSE.ASSETS.md`). Copyright holders at release: Data Collection AB,
  Joel Palmius, Jonas Hauquier.
- Copied: base mesh hm08, adult macro targets (young/old; no baby or child), default rig and weights.
- Target files: 192. Regenerate with `node tools/vendor-makehuman.mjs`.
- Only data is copied. mpfb2 code is GPL/AGPL and must not be copied into this repository.
- Updates are not tracked on purpose; this is a one-time snapshot.
