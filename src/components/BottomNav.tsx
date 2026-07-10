"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Wallet, ScanLine, ListChecks, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/accounts", label: "Accounts", icon: Wallet },
  { href: "/scan", label: "Scan", icon: ScanLine, primary: true },
  { href: "/transactions", label: "Activity", icon: ListChecks },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function BottomNav() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg">
      <div className="mx-auto flex max-w-md items-center justify-around px-2">
        {items.map(({ href, label, icon: Icon, primary }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          if (primary) {
            return (
              <Link key={href} href={href} className="-mt-6" aria-label={label}>
                <span
                  className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-strong text-white transition-transform active:scale-95"
                  style={{ boxShadow: "0 10px 22px -8px rgb(var(--brand-strong) / 0.55)" }}
                >
                  <Icon size={26} />
                </span>
              </Link>
            );
          }
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                active ? "text-brand" : "text-muted hover:text-text",
              )}
            >
              <span
                className={cn(
                  "grid h-8 w-14 place-items-center rounded-full transition-colors",
                  active && "bg-brand/12",
                )}
              >
                <Icon size={21} />
              </span>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
