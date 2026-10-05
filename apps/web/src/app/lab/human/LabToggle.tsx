/**
 * @file LabToggle.tsx
 * @description Small on/off pill button for the human lab viewport toolbar.
 * @scope cinelab-studio/web
 * @depends react
 */

export function LabToggle({ id, on, onChange, label }: { id: string; on: boolean; onChange: (on: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      data-testid={id}
      aria-pressed={on}
      onClick={() => onChange(!on)}
      className={`whitespace-nowrap rounded px-3 py-1 text-xs ${on ? "bg-neutral-100 text-neutral-900" : "bg-neutral-800 text-neutral-300"}`}
    >
      {label}
    </button>
  );
}
