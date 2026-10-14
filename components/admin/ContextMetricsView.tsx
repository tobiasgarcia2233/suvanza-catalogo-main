import Link from "next/link";
import { ChevronDown, TriangleAlert } from "lucide-react";
import type {
  ContextMetrics,
  ProductMetric,
  PromotionMetric,
} from "@/lib/eventMetrics";

const money = (n: number) => `$${Math.round(n).toLocaleString("es-AR")}`;
const avg = (amount: number, carts: number) => (carts > 0 ? amount / carts : 0);

// Sales metrics of one context (an event or "Individual"): totals, a seller
// ranking that expands into each seller's products and promos, and the
// context-wide product and promo breakdown.
export default function ContextMetricsView({ metrics }: { metrics: ContextMetrics }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Monto vendido" value={money(metrics.amount)} />
        <Stat label="Carros" value={metrics.carts.toLocaleString("es-AR")} />
        <Stat label="Unidades" value={metrics.units.toLocaleString("es-AR")} />
        <Stat label="Ticket promedio" value={money(avg(metrics.amount, metrics.carts))} />
      </div>

      {(metrics.pendingCarts > 0 || metrics.odooErrors > 0) && (
        <div className="flex flex-col gap-1 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {metrics.pendingCarts > 0 && (
            <p>
              {metrics.pendingCarts} pedido{metrics.pendingCarts === 1 ? "" : "s"} pendiente
              {metrics.pendingCarts === 1 ? "" : "s"} de pago ({money(metrics.pendingAmount)}):
              no cuentan hasta que se confirme el cobro.
            </p>
          )}
          {metrics.odooErrors > 0 && (
            <p className="flex items-center gap-1">
              <TriangleAlert size={14} /> {metrics.odooErrors} venta
              {metrics.odooErrors === 1 ? "" : "s"} con error al enviar a Odoo.{" "}
              <Link href="/odoo" className="font-semibold underline">
                Revisar
              </Link>
            </p>
          )}
        </div>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">Equipo de ventas</h2>
        {metrics.sellers.length === 0 ? (
          <p className="text-sm text-gray-500">Todavía no hay ventas.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <div className="hidden grid-cols-[2rem_1fr_repeat(4,7rem)_1.5rem] gap-2 border-b border-gray-200 bg-gray-50 px-4 py-2 text-xs uppercase tracking-wide text-gray-500 md:grid">
              <span>#</span>
              <span>Nombre</span>
              <span className="text-right">Monto</span>
              <span className="text-right">Carros</span>
              <span className="text-right">Unidades</span>
              <span className="text-right">Ticket prom.</span>
              <span />
            </div>
            {metrics.sellers.map((s, i) => (
              <details key={s.sellerName} className="group border-b border-gray-100 last:border-0">
                <summary className="grid cursor-pointer list-none grid-cols-[2rem_1fr_auto_1.5rem] items-center gap-2 px-4 py-3 text-sm hover:bg-gray-50 md:grid-cols-[2rem_1fr_repeat(4,7rem)_1.5rem] [&::-webkit-details-marker]:hidden">
                  <span className="tabular-nums text-gray-400">{i + 1}</span>
                  <span className="font-medium">
                    {s.sellerName}
                    {s.pendingCarts > 0 && (
                      <span className="ml-2 text-xs font-normal text-gray-500">
                        +{s.pendingCarts} pendiente{s.pendingCarts === 1 ? "" : "s"}
                      </span>
                    )}
                  </span>
                  <span className="text-right font-semibold tabular-nums">{money(s.amount)}</span>
                  <span className="hidden text-right tabular-nums md:block">{s.carts}</span>
                  <span className="hidden text-right tabular-nums md:block">{s.units}</span>
                  <span className="hidden text-right tabular-nums md:block">
                    {money(avg(s.amount, s.carts))}
                  </span>
                  <ChevronDown
                    size={16}
                    className="justify-self-end text-gray-400 transition-transform group-open:rotate-180"
                  />
                </summary>
                <div className="flex flex-col gap-4 bg-gray-50 px-4 py-4">
                  <p className="text-xs text-gray-600 md:hidden">
                    {s.carts} carro{s.carts === 1 ? "" : "s"} · {s.units} unidad
                    {s.units === 1 ? "" : "es"} · ticket {money(avg(s.amount, s.carts))}
                  </p>
                  {s.carts === 0 ? (
                    <p className="text-sm text-gray-500">Sin ventas cobradas.</p>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      <ProductTable products={s.products} />
                      <PromotionTable promotions={s.promotions} />
                    </div>
                  )}
                </div>
              </details>
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <h2 className="font-semibold">Productos</h2>
          <ProductTable products={metrics.products} />
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="font-semibold">Promociones</h2>
          <PromotionTable promotions={metrics.promotions} />
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

function ProductTable({ products }: { products: ProductMetric[] }) {
  return (
    <table className="w-full overflow-hidden rounded-md border border-gray-200 bg-white text-sm">
      <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
        <tr>
          <th className="px-3 py-2 text-left">Producto</th>
          <th className="px-3 py-2 text-right">Unid.</th>
          <th className="px-3 py-2 text-right">Monto</th>
        </tr>
      </thead>
      <tbody>
        {products.map((p) => (
          <tr key={p.key} className="border-b border-gray-100 last:border-0">
            <td className="px-3 py-1.5">{p.label}</td>
            <td className="px-3 py-1.5 text-right tabular-nums">{p.units}</td>
            <td className="px-3 py-1.5 text-right tabular-nums">{money(p.amount)}</td>
          </tr>
        ))}
        {products.length === 0 && (
          <tr>
            <td colSpan={3} className="px-3 py-4 text-center text-gray-500">
              Sin productos vendidos.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

function PromotionTable({ promotions }: { promotions: PromotionMetric[] }) {
  return (
    <table className="w-full overflow-hidden rounded-md border border-gray-200 bg-white text-sm">
      <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
        <tr>
          <th className="px-3 py-2 text-left">Promoción</th>
          <th className="px-3 py-2 text-right">Vendidas</th>
        </tr>
      </thead>
      <tbody>
        {promotions.map((p) => (
          <tr key={p.id} className="border-b border-gray-100 last:border-0">
            <td className="px-3 py-1.5">{p.title}</td>
            <td className="px-3 py-1.5 text-right tabular-nums">{p.quantity}</td>
          </tr>
        ))}
        {promotions.length === 0 && (
          <tr>
            <td colSpan={2} className="px-3 py-4 text-center text-gray-500">
              Sin promociones vendidas.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
