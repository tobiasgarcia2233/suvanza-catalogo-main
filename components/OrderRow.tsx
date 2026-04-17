"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Order } from "@/types";
import {
  Check,
  CheckCircle,
  CreditCard,
  Loader2,
  Pencil,
  Printer,
  StickyNote,
  Trash2,
} from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { useUIStore } from "@/store/uiStore";
import NotesModal from "./NotesModal";
import PaymentMethodModal from "./PaymentMethodModal";

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
  const { loadOrderForEdit } = useCartStore();
  const { openConfirmationModal, openCart } = useUIStore();

  const isCompleted = order.status === "COMPLETED";
  const anyBusy = busy !== null || isPending;
  const hasNotes = !!(order.notes && order.notes.trim());
  const hasPayment = !!order.payment_method;

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
    if (isCompleted || anyBusy) return;
    setBusy("editing");
    loadOrderForEdit(order);
    openCart();
    setBusy(null);
  };

  const handleDeleteClick = () => {
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

  const openPrintView = () => {
    window.open(`/orders/${order.id}/print`, "_blank");
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
              💳 {order.payment_method}
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

        <div className="flex justify-end gap-2">
          <button
            onClick={() => setNotesOpen(true)}
            className={`p-2 rounded-md transition disabled:opacity-50 ${
              hasNotes
                ? "bg-amber-500 hover:bg-amber-600 text-white"
                : "bg-gray-100 hover:bg-gray-200 text-gray-600"
            }`}
            aria-label="Nota"
            title={hasNotes ? "Ver / editar nota" : "Agregar nota"}
            disabled={anyBusy}
          >
            <StickyNote size={18} />
          </button>

          <button
            onClick={() => setPaymentOpen(true)}
            className={`p-2 rounded-md transition disabled:opacity-50 ${
              hasPayment
                ? "bg-indigo-500 hover:bg-indigo-600 text-white"
                : "bg-gray-100 hover:bg-gray-200 text-gray-600"
            }`}
            aria-label="Medio de pago"
            title={
              hasPayment
                ? `Medio de pago: ${order.payment_method}`
                : "Elegir medio de pago"
            }
            disabled={anyBusy}
          >
            <CreditCard size={18} />
          </button>

          <button
            onClick={openPrintView}
            className="bg-gray-100 hover:bg-gray-200 p-2 rounded-md text-gray-600 transition disabled:opacity-50"
            aria-label="Imprimir"
            title="Ver / imprimir"
            disabled={anyBusy}
          >
            <Printer size={18} />
          </button>

          <button
            onClick={handleEditClick}
            className="bg-gray-100 hover:bg-gray-200 disabled:opacity-50 p-2 rounded-md text-text-secondary transition disabled:cursor-not-allowed"
            aria-label="Editar"
            disabled={isCompleted || anyBusy}
          >
            {busy === "editing" ? spinner : <Pencil size={18} />}
          </button>

          {!isCompleted && (
            <button
              onClick={handleMarkPaid}
              className="bg-green-500 hover:bg-green-600 p-2 rounded-md text-white transition disabled:opacity-50"
              aria-label="Marcar como pagada"
              title="Marcar como pagada"
              disabled={anyBusy}
            >
              {busy === "paying" ? spinner : <Check size={18} />}
            </button>
          )}

          <button
            onClick={handleDeleteClick}
            className="bg-red-500 hover:bg-red-600 p-2 rounded-md text-white transition disabled:opacity-50"
            aria-label="Eliminar"
            disabled={anyBusy}
          >
            {busy === "deleting" ? spinner : <Trash2 size={18} />}
          </button>
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
        initialMethod={(order.payment_method as string | null) ?? null}
        buyerName={order.buyer_details.name}
        onSaved={refresh}
      />
    </>
  );
}
