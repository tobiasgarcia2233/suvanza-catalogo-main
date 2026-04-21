import { notFound } from "next/navigation";
import { getOrder } from "@/lib/orderQueries";
import PrintButton from "./PrintButton";

export const dynamic = "force-dynamic";

export default async function OrderPrintPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const order = await getOrder(orderId);
  if (!order) notFound();

  const created = new Date(order.created_at);
  const dateStr = created.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const timeStr = created.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const subtotal = order.total + order.discounted_amount;

  return (
    <div className="mx-auto p-8 max-w-3xl text-black bg-white">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pedido</h1>
          <p className="text-sm text-gray-600">ID: {order.id}</p>
          <p className="text-sm text-gray-600">
            {dateStr} — {timeStr} hs
          </p>
        </div>
        <PrintButton />
      </div>

      <section className="mb-6 grid grid-cols-2 gap-6">
        <div>
          <h2 className="text-sm uppercase tracking-wide text-gray-500">
            Comprador
          </h2>
          <p className="font-semibold">{order.buyer_details.name}</p>
          <p className="text-sm">DNI: {order.buyer_details.dni}</p>
          <p className="text-sm">Tel: {order.buyer_details.phone}</p>
        </div>
        <div>
          <h2 className="text-sm uppercase tracking-wide text-gray-500">
            Vendedor
          </h2>
          <p className="font-semibold">{order.seller_name}</p>
          <p className="text-sm mt-2">
            Estado:{" "}
            <span className="font-semibold">
              {order.status === "COMPLETED" ? "Pagada" : "Pendiente"}
            </span>
          </p>
        </div>
      </section>

      {order.payments && order.payments.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm uppercase tracking-wide text-gray-500 mb-1">
            Medios de pago
          </h2>
          <table className="w-full text-sm border-collapse">
            <tbody>
              {order.payments.map((p, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="py-1.5">{p.method}</td>
                  <td className="py-1.5 text-right font-medium">
                    ${p.amount.toLocaleString("es-AR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {order.notes && (
        <section className="mb-6">
          <h2 className="text-sm uppercase tracking-wide text-gray-500 mb-1">
            Nota
          </h2>
          <p className="text-sm whitespace-pre-wrap border border-gray-200 rounded-md p-3 bg-gray-50">
            {order.notes}
          </p>
        </section>
      )}

      <section className="mb-6">
        <h2 className="text-sm uppercase tracking-wide text-gray-500 mb-2">
          Items
        </h2>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">Producto</th>
              <th className="text-right py-2">Cantidad</th>
              <th className="text-right py-2">Precio unitario</th>
              <th className="text-right py-2">Total</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, i) => {
              const total = item.finalPrice ?? 0;
              const unit = item.quantity > 0 ? total / item.quantity : 0;
              return (
                <tr key={i} className="border-b">
                  <td className="py-2">
                    {item.brand ? (
                      <span className="text-gray-500">{item.brand} — </span>
                    ) : null}
                    {item.name}
                  </td>
                  <td className="text-right py-2">{item.quantity}</td>
                  <td className="text-right py-2">
                    ${unit.toLocaleString("es-AR", { maximumFractionDigits: 2 })}
                  </td>
                  <td className="text-right py-2">
                    ${total.toLocaleString("es-AR", { maximumFractionDigits: 2 })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="flex flex-col items-end gap-1 text-sm">
        <p>
          Subtotal:{" "}
          <span className="font-semibold">
            ${subtotal.toLocaleString("es-AR")}
          </span>
        </p>
        {order.discounted_amount > 0 && (
          <p>
            Descuento:{" "}
            <span className="font-semibold">
              -${order.discounted_amount.toLocaleString("es-AR")}
            </span>
          </p>
        )}
        <p className="text-lg">
          Total:{" "}
          <span className="font-bold">${order.total.toLocaleString("es-AR")}</span>
        </p>
      </section>

      <style>{`
        @media print {
          @page { margin: 14mm; }
          button { display: none !important; }
        }
      `}</style>
    </div>
  );
}
