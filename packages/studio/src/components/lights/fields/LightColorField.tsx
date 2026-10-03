/**
 * @file LightColorField.tsx
 * @description Light colour controls: swatches, picker, colour temperature, RGB and hex.
 * @scope cinelab-studio
 * @depends color, light-presets, light-rendering, studio-constants
 */

"use client";

import { useState } from "react";
import { hexToRgb, normalizeHex, rgbToHex } from "../../../color";
import { MAX_KELVIN, MIN_KELVIN, kelvinToHex } from "../../../light-presets";
import { FLASH_COLOR } from "../../../light-rendering";
import type { StudioLight } from "../../../scene-storage";
import { DEFAULT_KELVIN, LIGHT_COLORS, RGB_CHANNELS, type LightPatch } from "../../studio-constants";

export function LightColorField({ light, onChange }: { light: StudioLight; onChange: (patch: LightPatch) => void }) {
  const [hexDraft, setHexDraft] = useState(light.color.toUpperCase());
  const isFlash = light.lightType === "flash";
  const displayColor = isFlash ? FLASH_COLOR : light.color;
  const rgb = hexToRgb(displayColor);

  const setColor = (color: string) => {
    if (isFlash) return;
    setHexDraft(color.toUpperCase());
    onChange({ color, colorTemperature: null });
  };

  const setRgbChannel = (channelIndex: number, value: number) => {
    const nextRgb: [number, number, number] = [...rgb];
    nextRgb[channelIndex] = Math.max(0, Math.min(255, Number.isFinite(value) ? value : 0));
    setColor(rgbToHex(nextRgb));
  };

  return (
    <fieldset disabled={isFlash} className={isFlash ? "opacity-50" : undefined}>
      <legend className="mb-2 text-xs text-white/55">Color</legend>
      {isFlash ? <p className="mb-3 text-[10px] text-white/65">Flash color is locked to 5600K daylight ({FLASH_COLOR.toUpperCase()}).</p> : null}
      <div className="mb-3 flex items-center gap-2">
        {LIGHT_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            aria-label={`Set light color ${color}`}
            aria-pressed={displayColor === color}
            onClick={() => setColor(color)}
            className={`h-7 w-7 rounded-full border-2 transition hover:scale-110 ${
              displayColor === color ? "border-white" : "border-white/10"
            }`}
            style={{ backgroundColor: color }}
          />
        ))}
        <input
          aria-label="Light color picker"
          type="color"
          value={displayColor}
          onChange={(event) => setColor(event.target.value)}
          className="h-8 w-8 cursor-pointer rounded-full border-0 bg-transparent p-0"
        />
      </div>
      <label className="mb-3 block">
        <span className="mb-1 flex justify-between text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
          Colour temperature
          <span className="normal-case tracking-normal text-white/55">
            {isFlash ? "5600 K" : light.colorTemperature ? `${light.colorTemperature} K` : "Custom"}
          </span>
        </span>
        <input
          aria-label="Colour temperature"
          type="range"
          min={MIN_KELVIN}
          max={MAX_KELVIN}
          step="100"
          value={isFlash ? DEFAULT_KELVIN : light.colorTemperature ?? DEFAULT_KELVIN}
          onChange={(event) => {
            if (isFlash) return;
            const kelvin = Number(event.target.value);
            const color = kelvinToHex(kelvin);
            setHexDraft(color.toUpperCase());
            onChange({ color, colorTemperature: kelvin });
          }}
          className="w-full accent-amber-300"
        />
      </label>
      <div className="grid grid-cols-3 gap-2">
        {RGB_CHANNELS.map((channel, channelIndex) => (
          <label key={channel} className="block">
            <span className="mb-1 block text-[10px] font-semibold text-white/35">{channel}</span>
            <input
              aria-label={`${channel} color channel`}
              type="number"
              min="0"
              max="255"
              value={rgb[channelIndex]}
              onChange={(event) => setRgbChannel(channelIndex, Number(event.target.value))}
              className="h-9 w-full rounded-lg border border-white/10 bg-black/25 px-2 text-xs text-white outline-none transition focus:border-amber-300/70"
            />
          </label>
        ))}
      </div>
      <label className="mt-3 block">
        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
          Hex
        </span>
        <input
          aria-label="Light color hex code"
          type="text"
          value={isFlash ? FLASH_COLOR.toUpperCase() : hexDraft}
          maxLength={7}
          spellCheck={false}
          onChange={(event) => {
            if (isFlash) return;
            const nextDraft = event.target.value;
            setHexDraft(nextDraft.toUpperCase());
            const normalized = normalizeHex(nextDraft);
            if (normalized) onChange({ color: normalized, colorTemperature: null });
          }}
          onBlur={() => setHexDraft(light.color.toUpperCase())}
          className="h-9 w-full rounded-lg border border-white/10 bg-black/25 px-3 font-mono text-xs uppercase tracking-wider text-white outline-none transition focus:border-amber-300/70"
        />
      </label>
    </fieldset>
  );
}
