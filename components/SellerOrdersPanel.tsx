"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Pencil, Trash2, X } from "lucide-react";
import { useUIStore } from "@/store/uiStore";
import { useCartStore } from "@/store/cartStore";
import type { Order } from "@/types";

// Runtime field not in the shared Order type — see lib/orderQueries.ts.
type SellerOrder = Order & { transferred_to_odoo?: boolean };

function isFinalized(order: SellerOrder) {
  return order.status === "COMPLETED" || !!order.transferred_to_odoo;
}

export function SellerOrdersPanel({ sellerSlug }: { sellerSlug: string }) {
  const {
    openConfirmationModal,
    openCart,
    isSellerOrdersOpen: isOpen,
    closeSellerOrders,
  } = useUIStore();
  const { loadOrderForEdit } = useCartStore();
  const [isLoading, setIsLoading] = useState(false);
  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const loadOrders = async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/orders?sellerSlug=${encodeURIComponent(sellerSlug)}`,
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      setOrders(data.orders ?? []);
    } catch {
      setError("No se pudieron cargar tus pedidos.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleEdit = (order: SellerOrder) => {
    loadOrderForEdit(order, sellerSlug);
    closeSellerOrders();
    openCart();
  };

  const handleDelete = (order: SellerOrder) => {
    openConfirmationModal({
      title: "Eliminar pedido",
      message: `¿Eliminar el pedido de ${order.buyer_details.name}?`,
      onConfirm: async () => {
        setDeletingId(order.id);
        try {
          const res = await fetch(
            `/api/orders/${order.id}?sellerSlug=${encodeURIComponent(sellerSlug)}`,
            { method: "DELETE" },
          );
          if (!res.ok) throw new Error();
          setOrders((prev) => prev.filter((o) => o.id !== order.id));
        } catch {
          alert("No se pudo eliminar el pedido.");
        } finally {
          setDeletingId(null);
        }
      },
    });
  };

  if (!isOpen) return null;

  return (
    <div
      className="z-[70] fixed inset-0 flex justify-center items-center bg-background/80 backdrop-blur-sm p-4"
      onClick={closeSellerOrders}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex flex-col gap-4 bg-surface shadow-2xl p-6 rounded-xl w-full max-w-lg max-h-[80vh]"
      >
        <div className="flex justify-between items-center">
          <h2 className="font-bold text-xl">Mis ventas</h2>
          <button
            onClick={closeSellerOrders}
            className="hover:bg-gray-100 p-2 rounded-full text-text-secondary transition"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-10 text-text-secondary">
              <Loader2 size={24} className="animate-spin" />
            </div>
          ) : error ? (
            <p className="py-4 text-red-600 text-sm text-center">{error}</p>
          ) : orders.length === 0 ? (
            <p className="py-10 text-text-secondary text-sm text-center">
              Todavía no tenés ventas.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {orders.map((order) => {
                const finalized = isFinalized(order);
                return (
                  <li
                    key={order.id}
                    className={`flex justify-between items-center gap-3 p-3 rounded-lg ${
                      finalized ? "bg-green-50" : "bg-background"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="font-semibold truncate">
                        {order.buyer_details.name}
                      </p>
                      <p className="text-text-secondary text-xs">
                        {new Date(order.created_at).toLocaleDateString("es-AR", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        — ${order.total.toLocaleString("es-AR")}
                      </p>
                    </div>
                    {finalized ? (
                      <span className="flex items-center gap-1 bg-green-100 shrink-0 px-2.5 py-1 rounded-full font-medium text-green-700 text-xs">
                        <CheckCircle2 size={14} />
                        Concretada
                      </span>
                    ) : (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleEdit(order)}
                          disabled={deletingId === order.id}
                          className="p-2 rounded-full text-gray-400 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-50"
                          aria-label="Editar pedido"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(order)}
                          disabled={deletingId === order.id}
                          className="p-2 rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
                          aria-label="Eliminar pedido"
                        >
                          {deletingId === order.id ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
