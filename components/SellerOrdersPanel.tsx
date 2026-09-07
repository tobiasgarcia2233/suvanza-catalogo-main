"use client";

import { useEffect, useState } from "react";
import { ClipboardList, Loader2, Trash2, X } from "lucide-react";
import { useUIStore } from "@/store/uiStore";
import type { Order } from "@/types";

export function SellerOrdersPanel({ sellerSlug }: { sellerSlug: string }) {
  const { openConfirmationModal } = useUIStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
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

  const handleDelete = (order: Order) => {
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

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="left-8 bottom-8 z-50 fixed bg-gray-800 shadow-lg p-4 rounded-full text-white hover:scale-110 transition-transform duration-200"
        aria-label="Mis pedidos"
      >
        <ClipboardList size={28} />
      </button>

      {isOpen && (
        <div
          className="z-[70] fixed inset-0 flex justify-center items-center bg-background/80 backdrop-blur-sm p-4"
          onClick={() => setIsOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative flex flex-col gap-4 bg-surface shadow-2xl p-6 rounded-xl w-full max-w-lg max-h-[80vh]"
          >
            <div className="flex justify-between items-center">
              <h2 className="font-bold text-xl">Mis pedidos</h2>
              <button
                onClick={() => setIsOpen(false)}
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
                  No tenés pedidos pendientes.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {orders.map((order) => (
                    <li
                      key={order.id}
                      className="flex justify-between items-center gap-3 bg-background p-3 rounded-lg"
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
                      <button
                        onClick={() => handleDelete(order)}
                        disabled={deletingId === order.id}
                        className="p-2 rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50 shrink-0"
                        aria-label="Eliminar pedido"
                      >
                        {deletingId === order.id ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
