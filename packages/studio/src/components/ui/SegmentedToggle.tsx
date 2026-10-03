/**
 * @file SegmentedToggle.tsx
 * @description Pressed-state button group used for light role, type and softbox choices.
 * @scope cinelab-studio
 * @depends react
 */

"use client";

export function SegmentedToggle<T extends string>({
  legend,
  options,
  value,
  onChange,
  columns,
  buttonClassName = "px-3 py-2",
  hint,
}: {
  legend: string;
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T | null;
  onChange: (value: T) => void;
  columns: 2 | 3;
  buttonClassName?: string;
  hint?: string;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-xs text-white/55">{legend}</legend>
      <div className={`grid ${columns === 3 ? "grid-cols-3" : "grid-cols-2"} gap-1 rounded-xl bg-black/25 p-1`}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
            className={`rounded-lg ${buttonClassName} text-xs font-medium transition ${
              value === option.value ? "bg-white text-neutral-950" : "text-white/45 hover:text-white"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
      {hint ? <p className="mt-1.5 text-[10px] text-white/35">{hint}</p> : null}
    </fieldset>
  );
}
