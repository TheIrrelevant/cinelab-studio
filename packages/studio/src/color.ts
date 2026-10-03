/**
 * @file color.ts
 * @description Hex and RGB colour helpers for the light colour controls.
 * @scope cinelab-studio
 * @depends none
 */



export function normalizeHex(value: string) {
  const candidate = value.startsWith("#") ? value : `#${value}`;
  if (/^#[0-9a-fA-F]{6}$/.test(candidate)) return candidate.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(candidate)) {
    return `#${candidate[1]}${candidate[1]}${candidate[2]}${candidate[2]}${candidate[3]}${candidate[3]}`.toLowerCase();
  }
  return null;
}

export function hexToRgb(hex: string): [number, number, number] {
  const normalized = normalizeHex(hex) ?? "#ffffff";
  return [
    Number.parseInt(normalized.slice(1, 3), 16),
    Number.parseInt(normalized.slice(3, 5), 16),
    Number.parseInt(normalized.slice(5, 7), 16),
  ];
}

export function rgbToHex(rgb: [number, number, number]) {
  return `#${rgb
    .map((channel) => Math.max(0, Math.min(255, channel)).toString(16).padStart(2, "0"))
    .join("")}`;
}
