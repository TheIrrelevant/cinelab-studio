/**
 * @file LightSettingsPanel.tsx
 * @description Settings panel for the selected light: role, stand, type, softbox, aim, output and colour.
 * @scope cinelab-studio
 * @depends SegmentedToggle, light fields, light-presets, panel-styles, studio-constants
 */

"use client";

import type { LightRole } from "../../light-presets";
import type { StudioLight } from "../../scene-storage";
import { RIGHT_PANEL_CLASS } from "../panel-styles";
import { LIGHT_ROLE_LABELS, type LightPatch } from "../studio-constants";
import { SegmentedToggle } from "../ui/SegmentedToggle";
import { HeadRotationField } from "./fields/HeadRotationField";
import { LightColorField } from "./fields/LightColorField";
import { PowerSpreadFields, StandHeightField } from "./fields/OutputFields";
import { SoftboxDimensions } from "./fields/SoftboxDimensions";

const ROLE_OPTIONS = (Object.keys(LIGHT_ROLE_LABELS) as LightRole[]).map((role) => ({
  value: role,
  label: LIGHT_ROLE_LABELS[role],
}));
const TYPE_OPTIONS = [
  { value: "bare", label: "Bare Light" },
  { value: "flash", label: "Flash" },
] as const;
const MODIFIER_OPTIONS = [
  { value: "none", label: "Without softbox" },
  { value: "softbox", label: "With softbox" },
] as const;

export function LightSettingsPanel({
  light,
  onChange,
  onClose,
  onResetTransform,
  onApplyRole,
}: {
  light: StudioLight;
  onChange: (patch: LightPatch) => void;
  onClose: () => void;
  onResetTransform: () => void;
  onApplyRole?: (role: LightRole) => void;
}) {
  return (
    <aside className={RIGHT_PANEL_CLASS}>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">
            Selected light
          </p>
          <h2 className="mt-1 text-sm font-medium text-white">
            {light.role ? `${LIGHT_ROLE_LABELS[light.role]} light` : "Light settings"}
          </h2>
        </div>
        <button
          type="button"
          aria-label="Close light settings"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-full text-white/50 transition hover:bg-white/10 hover:text-white"
        >
          ×
        </button>
      </div>

      <div className="space-y-5">
        {onApplyRole ? (
          <SegmentedToggle
            legend="Lighting role"
            options={ROLE_OPTIONS}
            value={light.role}
            onChange={onApplyRole}
            columns={3}
            buttonClassName="px-2 py-2"
            hint="Places and aims the light around the subject."
          />
        ) : null}
        <button
          type="button"
          onClick={onResetTransform}
          className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-left text-xs text-white/65 transition hover:border-amber-300/40 hover:bg-amber-300/10 hover:text-amber-100"
        >
          <span>
            <span className="block font-medium text-white">Default pose</span>
            <span className="mt-0.5 block text-[10px] text-white/35">Reset position and rotation</span>
          </span>
          <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M4 4v6h6M5.5 9A8 8 0 1 1 4 14" />
          </svg>
        </button>
        <StandHeightField light={light} onChange={onChange} />
        <SegmentedToggle
          legend="Light type"
          options={TYPE_OPTIONS}
          value={light.lightType}
          onChange={(lightType) => onChange({ lightType })}
          columns={2}
        />
        <SegmentedToggle
          legend="Softbox"
          options={MODIFIER_OPTIONS}
          value={light.modifier}
          onChange={(modifier) => onChange({ modifier })}
          columns={2}
        />
        {light.modifier === "softbox" ? <SoftboxDimensions light={light} onChange={onChange} /> : null}
        <HeadRotationField light={light} onChange={onChange} />
        <PowerSpreadFields light={light} onChange={onChange} />
        <LightColorField light={light} onChange={onChange} />
      </div>
    </aside>
  );
}
