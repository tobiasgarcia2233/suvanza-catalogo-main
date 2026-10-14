"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { isClosedSale, type Order } from "@/types";

interface ContextStats {
  carts: number;
  units: number;
  amount: number;
}

/** Stats per context: "individual" or an event id. null while loading. */
const StatsContext = createContext<Map<string, ContextStats> | null>(null);

// The profile page is cached (ISR) while sales change all the time, so the
// numbers are loaded in the browser — one request for every card.
export function SellerStatsProvider({
  sellerSlug,
  children,
}: {
  sellerSlug: string;
  children: React.ReactNode;
}) {
  const [stats, setStats] = useState<Map<string, ContextStats> | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/orders?sellerSlug=${encodeURIComponent(sellerSlug)}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { orders: [] }))
      .then(({ orders }: { orders: Order[] }) => {
        if (cancelled) return;
        const out = new Map<string, ContextStats>();
        for (const o of orders) {
          if (!isClosedSale(o.status)) continue;
          const key = o.event_id ?? "individual";
          const s = out.get(key) ?? { carts: 0, units: 0, amount: 0 };
          s.carts += 1;
          s.amount += o.total;
          s.units += o.items.reduce((sum, it) => sum + (it.quantity || 0), 0);
          out.set(key, s);
        }
        setStats(out);
      })
      .catch(() => {
        /* numbers are a nice-to-have: leave the cards without them */
      });
    return () => {
      cancelled = true;
    };
  }, [sellerSlug]);

  return <StatsContext.Provider value={stats}>{children}</StatsContext.Provider>;
}

/** "3 carros · 12 unid. · $450.000" for a context's paid sales. */
export function ContextStatsLine({ context }: { context: string }) {
  const stats = useContext(StatsContext);
  if (!stats) {
    return <span className="inline-block bg-border/60 rounded w-40 h-4 animate-pulse align-middle" />;
  }
  const s = stats.get(context);
  if (!s) return <span>Sin ventas cobradas</span>;
  return (
    <span className="tabular-nums">
      {s.carts} carro{s.carts === 1 ? "" : "s"} · {s.units} unid. ·{" "}
      <span className="font-semibold text-brand">
        ${Math.round(s.amount).toLocaleString("es-AR")}
      </span>
    </span>
  );
}
