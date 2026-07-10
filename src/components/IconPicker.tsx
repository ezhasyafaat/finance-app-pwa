"use client";
import Icon from "./Icon";

/** Grid of selectable icons. The active one fills with the chosen colour. */
export default function IconPicker({
  icons,
  value,
  onChange,
  color,
}: {
  icons: string[];
  value: string | null;
  onChange: (name: string) => void;
  color?: string | null;
}) {
  return (
    <div className="grid grid-cols-6 gap-2">
      {icons.map((ic) => {
        const active = value === ic;
        return (
          <button
            key={ic}
            type="button"
            onClick={() => onChange(ic)}
            aria-label={ic}
            aria-pressed={active}
            className={`grid aspect-square place-items-center rounded-xl border transition-all active:scale-95 ${
              active ? "border-transparent text-white" : "border-border text-muted hover:text-text hover:border-brand/40"
            }`}
            style={active ? { background: color || "rgb(var(--brand))" } : undefined}
          >
            <Icon name={ic} size={18} />
          </button>
        );
      })}
    </div>
  );
}
