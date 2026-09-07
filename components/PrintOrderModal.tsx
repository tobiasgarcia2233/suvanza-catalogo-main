"use client";

import { Printer, X } from "lucide-react";
import { usePauseRefresh } from "@/store/refreshGuardStore";
import { OrderPrintContent } from "./OrderPrintContent";
import type { Order } from "@/types";

export default function PrintOrderModal({
  open,
  onClose,
  order,
}: {
  open: boolean;
  onClose: () => void;
  order: Order;
}) {
  usePauseRefresh(open);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 p-4 print:bg-transparent print:p-0"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto relative print:max-h-none print:overflow-visible print:shadow-none print:rounded-none"
      >
        <div className="sticky top-0 flex items-center justify-end gap-2 bg-white border-b border-gray-200 p-3 print:hidden">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
          >
            <Printer size={16} /> Imprimir
          </button>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700"
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>

        <div id="order-print-area">
          <OrderPrintContent order={order} />
        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #order-print-area, #order-print-area * { visibility: visible; }
          #order-print-area { position: fixed; inset: 0; width: 100%; }
          @page { margin: 14mm; }
        }
      `}</style>
    </div>
  );
}
