import { ArrowDownRight, ArrowUpRight, Scale } from "lucide-react";
import Icon from "./Icon";

const BASE = "grid h-10 w-10 shrink-0 place-items-center rounded-full";

/**
 * Transaction row avatar: the category icon in its own colour when available,
 * otherwise an income/expense direction arrow (or a scale for adjustments).
 */
export default function TxIcon({
  type,
  categoryIcon,
  categoryColor,
}: {
  type: string;
  categoryIcon?: string | null;
  categoryColor?: string | null;
}) {
  if (type === "adjustment") {
    return (
      <span className={`${BASE} bg-muted/15 text-muted`}>
        <Scale size={16} />
      </span>
    );
  }
  if (categoryIcon) {
    // hex + "22" ≈ 13% alpha tile in the category's own colour
    const bg = categoryColor ? `${categoryColor}22` : "rgb(var(--brand) / 0.12)";
    return (
      <span className={BASE} style={{ background: bg, color: categoryColor || "rgb(var(--brand))" }}>
        <Icon name={categoryIcon} size={18} />
      </span>
    );
  }
  const income = type === "income";
  return (
    <span className={`${BASE} ${income ? "bg-income/15 text-income" : "bg-expense/15 text-expense"}`}>
      {income ? <ArrowDownRight size={18} /> : <ArrowUpRight size={18} />}
    </span>
  );
}
