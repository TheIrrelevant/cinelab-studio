/**
 * @file editor-controls.tsx
 * @description Generic form primitives for the character editor: a labelled field
 *   wrapper and a segmented radio group.
 * @scope cinelab-studio
 * @depends react
 */

import type { ReactNode } from "react";

export function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-neutral-300">
        {label}
        {required && <span className="ml-1 text-neutral-500">*</span>}
      </label>
      {children}
    </div>
  );
}

export function Segmented({
  options,
  value,
  onChange,
}: {
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((label) => (
        <label
          key={label}
          className={`cursor-pointer rounded-full border px-4 py-1.5 text-sm capitalize ${
            value === label
              ? "border-neutral-200 bg-neutral-800"
              : "border-neutral-700 hover:bg-neutral-900"
          }`}
        >
          <input
            type="radio"
            className="sr-only"
            checked={value === label}
            onChange={() => onChange(label)}
          />
          {label}
        </label>
      ))}
    </div>
  );
}
