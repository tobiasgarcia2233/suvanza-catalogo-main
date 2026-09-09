"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Order } from "@/types";
import {
  Check,
  CheckCircle,
  CreditCard,
  Loader2,
  MoreVertical,
  Pencil,
  Printer,
  StickyNote,
  Trash2,
} from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { useUIStore } from "@/store/uiStore";
import NotesModal from "./NotesModal";
import PaymentMethodModal from "./PaymentMethodModal";
import PrintOrderModal from "./PrintOrderModal";

interface OrderRowProps {
  order: Order;
}

type Busy = null | "paying" | "deleting" | "editing";

export function OrderRow({ order }: OrderRowProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [busy, setBusy] = useState<Busy>(null);
  const [showUpdateSuccess, setShowUpdateSuccess] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { loadOrderForEdit } = useCartStore();
  const { openConfirmationModal, openCart } = useUIStore();

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

  const isCompleted = order.status === "COMPLETED";
  const anyBusy = busy !== null || isPending;
  const hasNotes = !!(order.notes && order.notes.trim());
  const paymentsList = order.payments ?? [];
  const hasPayment = paymentsList.length > 0;
  const paymentsLabel = hasPayment
    ? paymentsList.length === 1
      ? paymentsList[0].method
      : `${paymentsList.length} medios`
    : null;

  const formattedDate = new Date(order.created_at).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const formattedTime = new Date(order.created_at).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const refresh = () => {
    setShowUpdateSuccess(true);
    startTransition(() => router.refresh());
    setTimeout(() => setShowUpdateSuccess(false), 1200);
  };

  const handleEditClick = () => {
    setMenuOpen(false);
    if (isCompleted || anyBusy) return;
    setBusy("editing");
    loadOrderForEdit(order);
    openCart();
    setBusy(null);
  };

  const handleDeleteClick = () => {
    setMenuOpen(false);
    openConfirmationModal({
      title: "Confirmar Eliminación",
      message: `¿Eliminar la orden de ${order.buyer_details.name}?`,
      onConfirm: async () => {
        setBusy("deleting");
        try {
          const res = await fetch(`/api/orders/${order.id}`, {
            method: "DELETE",
          });
          if (!res.ok) throw new Error();
          startTransition(() => router.refresh());
        } catch {
          alert("No se pudo eliminar.");
          setBusy(null);
        }
      },
    });
  };

  const handleMarkPaid = () => {
    setMenuOpen(false);
    openConfirmationModal({
      title: "Marcar como pagada",
      message: `¿Confirmás el cobro de la orden de ${order.buyer_details.name}?`,
      onConfirm: async () => {
        setBusy("paying");
        try {
          const res = await fetch(`/api/orders/${order.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "COMPLETED" }),
          });
          if (!res.ok) throw new Error();
          refresh();
        } catch {
          alert("No se pudo actualizar.");
        } finally {
          setBusy(null);
        }
      },
    });
  };

  const spinner = <Loader2 size={18} className="animate-spin" />;

  return (
    <>
      {showUpdateSuccess && (
        <div className="z-[100] fixed inset-0 flex justify-center items-center bg-update/80 backdrop-blur-sm animate-flash-update pointer-events-none">
          <CheckCircle className="text-white" size={128} strokeWidth={1.5} />
        </div>
      )}

      <div
        className={`grid grid-cols-7 items-center gap-4 rounded-lg border p-4 transition-all
          ${isCompleted ? "bg-gray-100" : "bg-surface hover:shadow-md"}
          ${anyBusy ? "opacity-70" : ""}`}
      >
        <div className="col-span-2">
          <p className="font-bold text-text-primary">
            {order.buyer_details.name}
          </p>
          <p className="text-text-secondary text-sm">
            DNI: {order.buyer_details.dni}
          </p>
          {hasPayment && (
            <p className="text-text-secondary text-xs mt-0.5">
              💳 {paymentsLabel}
            </p>
          )}
        </div>
        <div>
          <p>{order.seller_name}</p>
        </div>
        <div>
          <p>{formattedDate}</p>
          <p className="text-text-secondary text-sm">{formattedTime} hs</p>
        </div>
        <div className="text-right">
          <p className="font-bold text-brand text-lg">
            ${order.total.toLocaleString("es-AR")}
          </p>
        </div>
        <div className="flex justify-center">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
              isCompleted
                ? "bg-green-100 text-green-800"
                : "bg-yellow-100 text-yellow-800"
            }`}
          >
            {isCompleted ? "Pagada" : "Pendiente"}
          </span>
        </div>

        <div className="flex justify-end">
          <div ref={menuRef} className="relative">
            <button
              onClick={() => setMenuOpen((open) => !open)}
              className="bg-gray-100 hover:bg-gray-200 disabled:opacity-50 p-2 rounded-md text-gray-600 transition disabled:cursor-not-allowed"
              aria-label="Opciones"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              disabled={anyBusy}
            >
              {anyBusy ? spinner : <MoreVertical size={18} />}
            </button>

            {!anyBusy && (hasNotes || hasPayment || isCompleted) && (
              <span className="top-full left-1/2 absolute flex items-center gap-1 mt-1 -translate-x-1/2">
                {hasNotes && (
                  <span
                    className="bg-orange-500 rounded-full w-2 h-2"
                    title="Tiene nota"
                  />
                )}
                {hasPayment && (
                  <span
                    className="bg-violet-500 rounded-full w-2 h-2"
                    title="Medio de pago cargado"
                  />
                )}
                {isCompleted && (
                  <span
                    className="bg-green-500 rounded-full w-2 h-2"
                    title="Pagada"
                  />
                )}
              </span>
            )}

            {menuOpen && (
              <div
                role="menu"
                className="right-0 z-10 absolute bg-surface shadow-lg mt-1 py-1 border border-border rounded-md w-56"
              >
                <button
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    setNotesOpen(true);
                  }}
                  className="flex items-center gap-2 hover:bg-background px-3 py-2 w-full text-sm text-left transition"
                >
                  <StickyNote
                    size={16}
                    className={hasNotes ? "text-orange-500" : "text-text-secondary"}
                  />
                  {hasNotes ? "Ver / editar nota" : "Agregar nota"}
                </button>

                <button
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    setPaymentOpen(true);
                  }}
                  className="flex items-center gap-2 hover:bg-background px-3 py-2 w-full text-sm text-left transition"
                >
                  <CreditCard
                    size={16}
                    className={hasPayment ? "text-violet-500" : "text-text-secondary"}
                  />
                  {hasPayment ? `Medios de pago (${paymentsLabel})` : "Cargar medios de pago"}
                </button>

                <button
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    setPrintOpen(true);
                  }}
                  className="flex items-center gap-2 hover:bg-background px-3 py-2 w-full text-sm text-left transition"
                >
                  <Printer size={16} className="text-text-secondary" />
                  Ver / imprimir
                </button>

                <button
                  role="menuitem"
                  onClick={handleEditClick}
                  disabled={isCompleted}
                  className="flex items-center gap-2 hover:bg-background disabled:opacity-40 disabled:hover:bg-transparent px-3 py-2 w-full text-sm text-left transition disabled:cursor-not-allowed"
                >
                  <Pencil size={16} className="text-text-secondary" />
                  Editar pedido
                </button>

                {!isCompleted && (
                  <button
                    role="menuitem"
                    onClick={handleMarkPaid}
                    className="flex items-center gap-2 hover:bg-background px-3 py-2 w-full text-green-700 text-sm text-left transition"
                  >
                    <Check size={16} />
                    Marcar como pagada
                  </button>
                )}

                <div className="my-1 border-border border-t" />

                <button
                  role="menuitem"
                  onClick={handleDeleteClick}
                  className="flex items-center gap-2 hover:bg-red-50 px-3 py-2 w-full text-red-600 text-sm text-left transition"
                >
                  <Trash2 size={16} />
                  Eliminar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <NotesModal
        open={notesOpen}
        onClose={() => setNotesOpen(false)}
        orderId={order.id}
        initialNotes={order.notes ?? ""}
        buyerName={order.buyer_details.name}
        onSaved={refresh}
      />
      <PaymentMethodModal
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        orderId={order.id}
        orderTotal={order.total}
        initialPayments={order.payments ?? null}
        buyerName={order.buyer_details.name}
        onSaved={refresh}
      />
      <PrintOrderModal
        open={printOpen}
        onClose={() => setPrintOpen(false)}
        order={order}
      />
    </>
  );
}
