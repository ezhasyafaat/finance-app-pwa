"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Pencil, Trash2 } from "lucide-react";
import { api } from "@/lib/apiClient";
import BottomNav from "@/components/BottomNav";
import Icon, { CATEGORY_ICONS } from "@/components/Icon";
import IconPicker from "@/components/IconPicker";
import { useUI } from "@/components/UIProvider";

interface Category {
  id: string;
  name: string;
  type: "income" | "expense";
  color: string | null;
  icon: string | null;
  isDefault: boolean;
}

const PALETTE = ["#7ab2e2", "#7fcfae", "#a99fe0", "#eaa6c4", "#f0b58a", "#6fc7c2", "#ecd98a", "#e79a94", "#a8c99a", "#9aa7b8"];

export default function CategoriesPage() {
  const router = useRouter();
  const [cats, setCats] = useState<Category[]>([]);
  const [editing, setEditing] = useState<Category | null>(null);
  const [adding, setAdding] = useState<"income" | "expense" | null>(null);
  const { confirm, toast } = useUI();

  const load = () => api.get<Category[]>("/api/categories").then(setCats);
  useEffect(() => { load(); }, []);

  async function remove(c: Category) {
    const ok = await confirm({
      title: "Hapus kategori?",
      message: `"${c.name}" dihapus. Transaksi lama tetap ada, tanpa kategori.`,
      confirmLabel: "Hapus",
      danger: true,
    });
    if (!ok) return;
    await api.del(`/api/categories/${c.id}`);
    toast("Kategori dihapus");
    load();
  }

  const groups: { type: "expense" | "income"; label: string }[] = [
    { type: "expense", label: "Pengeluaran" },
    { type: "income", label: "Pemasukan" },
  ];

  return (
    <main className="mx-auto max-w-md px-4 pb-28 pt-6">
      <header className="mb-4 flex items-center gap-2">
        <button
          onClick={() => router.back()}
          aria-label="Kembali"
          className="grid h-10 w-10 place-items-center rounded-full border border-border bg-surface text-muted transition-colors hover:text-text"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-lg font-bold">Kelola kategori</h1>
      </header>

      {groups.map((g) => (
        <section key={g.type} className="mb-5">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted">{g.label}</h2>
            <button onClick={() => setAdding(g.type)} className="chip">
              <Plus size={13} /> Tambah
            </button>
          </div>
          <div className="card divide-y divide-border">
            {cats.filter((c) => c.type === g.type).map((c) => (
              <div key={c.id} className="flex items-center gap-3 p-3.5">
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
                  style={{ background: (c.color ?? "#9aa7b8") + "22", color: c.color ?? "#9aa7b8" }}
                >
                  <Icon name={c.icon} size={16} />
                </span>
                <p className="flex-1 font-medium">{c.name}</p>
                <button onClick={() => setEditing(c)} className="text-muted transition-colors hover:text-brand">
                  <Pencil size={15} />
                </button>
                <button onClick={() => remove(c)} className="text-muted transition-colors hover:text-expense">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
            {cats.filter((c) => c.type === g.type).length === 0 && (
              <p className="p-5 text-center text-sm text-muted">Belum ada kategori.</p>
            )}
          </div>
        </section>
      ))}

      {(editing || adding) && (
        <CategorySheet
          category={editing}
          type={editing?.type ?? adding!}
          onClose={() => { setEditing(null); setAdding(null); }}
          onSaved={() => { setEditing(null); setAdding(null); load(); }}
        />
      )}

      <BottomNav />
    </main>
  );
}

function CategorySheet({
  category,
  type,
  onClose,
  onSaved,
}: {
  category: Category | null;
  type: "income" | "expense";
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(category?.name ?? "");
  const [color, setColor] = useState(category?.color ?? PALETTE[0]);
  const [icon, setIcon] = useState(category?.icon ?? CATEGORY_ICONS[0]);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (category) await api.patch(`/api/categories/${category.id}`, { name, color, icon });
      else await api.post("/api/categories", { name, type, color, icon });
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-3xl border-t border-border bg-surface p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl" style={{ background: color + "22", color }}>
            <Icon name={icon} size={22} />
          </span>
          <div>
            <h2 className="text-lg font-semibold">{category ? "Edit kategori" : "Tambah kategori"}</h2>
            <p className="text-xs text-muted">{name.trim() || "Pratinjau"}</p>
          </div>
        </div>

        <label className="label">Nama</label>
        <input className="field mb-3" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama kategori" />

        <label className="label">Warna</label>
        <div className="mb-3 flex flex-wrap gap-2">
          {PALETTE.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              aria-label={c}
              className={`h-8 w-8 rounded-full transition-transform ${color === c ? "scale-110" : ""}`}
              style={{ background: c, boxShadow: color === c ? `0 0 0 2px rgb(var(--surface)), 0 0 0 4px ${c}` : undefined }}
            />
          ))}
        </div>

        <label className="label">Ikon</label>
        <div className="mb-4 max-h-44 overflow-y-auto pr-1">
          <IconPicker icons={CATEGORY_ICONS} value={icon} onChange={setIcon} color={color} />
        </div>

        <button onClick={save} disabled={!name.trim() || saving} className="btn-brand w-full">
          {saving ? "Menyimpan…" : "Simpan"}
        </button>
      </div>
    </div>
  );
}
