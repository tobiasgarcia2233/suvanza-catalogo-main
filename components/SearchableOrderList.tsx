"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Order } from "@/types";
import { OrderRow } from "./OrderRow";
import { Search, X } from "lucide-react";
import { isRefreshPaused } from "@/store/refreshGuardStore";

interface SearchableOrderListProps {
  initialOrders: Order[];
}

export function SearchableOrderList({ initialOrders }: SearchableOrderListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [startDate, setStartDate] = useState(searchParams.get("startDate") || "");
  const [endDate, setEndDate] = useState(searchParams.get("endDate") || "");

  useEffect(() => {
    const interval = setInterval(() => {
      if (isRefreshPaused()) return;
      if (!searchParams.get("startDate") && !searchParams.get("endDate")) {
        router.refresh();
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [router, searchParams]);

  const updateUrlParams = () => {
    startTransition(() => {
      const params = new URLSearchParams(window.location.search);
      if (searchQuery) params.set("q", searchQuery);
      else params.delete("q");
      if (startDate) params.set("startDate", startDate);
      else params.delete("startDate");
      if (endDate) params.set("endDate", endDate);
      else params.delete("endDate");
      router.push(`/orders?${params.toString()}`);
    });
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStartDate("");
    setEndDate("");
    startTransition(() => router.push("/orders"));
  };

  return (
    <div>
      <div className="flex sm:flex-row flex-col gap-4 mb-6">
        <div className="relative flex-grow">
          <Search
            className="top-1/2 left-4 absolute text-text-secondary -translate-y-1/2"
            size={20}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && updateUrlParams()}
            placeholder="Buscar por nombre o DNI y presionar Enter"
            className="bg-surface py-3 pr-10 pl-12 border border-border focus:border-brand rounded-lg focus:ring-brand w-full text-lg"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("");
                startTransition(() => {
                  const params = new URLSearchParams(window.location.search);
                  params.delete("q");
                  router.push(`/orders?${params.toString()}`);
                });
              }}
              className="top-1/2 right-4 absolute text-text-secondary hover:text-text-primary -translate-y-1/2"
            >
              <X size={20} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-surface px-4 py-3 border border-border focus:border-brand rounded-lg focus:ring-brand w-full text-lg"
          />
          <span className="text-text-secondary">a</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-surface px-4 py-3 border border-border focus:border-brand rounded-lg focus:ring-brand w-full text-lg"
          />
          <button
            onClick={updateUrlParams}
            className="bg-brand hover:bg-brand-dark px-6 py-3 rounded-lg font-bold text-white text-lg"
          >
            Filtrar
          </button>
          <button
            onClick={clearFilters}
            className="bg-surface hover:bg-gray-200 px-6 py-3 border border-border rounded-lg font-bold text-text-secondary text-lg"
          >
            Limpiar
          </button>
        </div>
      </div>

      {isPending && <p className="text-text-secondary text-center">Buscando...</p>}

      {!isPending &&
        (initialOrders.length > 0 ? (
          <div className="flex flex-col gap-4">
            <div className="gap-4 grid grid-cols-7 px-4 pb-2 border-border border-b">
              <div className="col-span-2 font-semibold text-text-secondary text-sm">
                COMPRADOR
              </div>
              <div className="font-semibold text-text-secondary text-sm">
                VENDEDOR
              </div>
              <div className="font-semibold text-text-secondary text-sm">FECHA</div>
              <div className="font-semibold text-text-secondary text-sm text-right">
                TOTAL
              </div>
              <div className="font-semibold text-text-secondary text-sm text-center">
                ESTADO
              </div>
              <div className="font-semibold text-text-secondary text-sm text-right">
                ACCIONES
              </div>
            </div>
            {initialOrders.map((order) => (
              <OrderRow key={order.id} order={order} />
            ))}
          </div>
        ) : (
          <div className="flex justify-center items-center bg-surface border-2 border-border border-dashed rounded-lg h-64">
            <p className="text-text-secondary">
              {searchQuery || startDate || endDate
                ? "No se encontraron pedidos para los filtros aplicados."
                : "No hay pedidos recientes."}
            </p>
          </div>
        ))}
    </div>
  );
}
