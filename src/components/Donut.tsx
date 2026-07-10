/**
 * Donut chart from weighted slices. Renders segments as stroked arcs on one
 * circle using stroke-dasharray offsets. Purely presentational.
 */
export default function Donut({
  slices,
  size = 168,
  stroke = 26,
  children,
}: {
  slices: { amount: number; color: string | null }[];
  size?: number;
  stroke?: number;
  children?: React.ReactNode;
}) {
  const total = slices.reduce((s, x) => s + x.amount, 0);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let acc = 0;

  const fallback = ["#7ab2e2", "#7fcfae", "#a99fe0", "#eaa6c4", "#f0b58a", "#6fc7c2", "#ecd98a", "#e79a94"];

  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="text-surface-2" stroke="currentColor" />
        {total > 0 &&
          slices.map((s, i) => {
            const frac = s.amount / total;
            const len = frac * c;
            const seg = (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                strokeWidth={stroke}
                stroke={s.color ?? fallback[i % fallback.length]}
                strokeDasharray={`${len} ${c - len}`}
                strokeDashoffset={-acc}
                style={{ transition: "stroke-dasharray 500ms ease" }}
              />
            );
            acc += len;
            return seg;
          })}
      </svg>
      {children && <div className="absolute inset-0 grid place-items-center text-center">{children}</div>}
    </div>
  );
}
