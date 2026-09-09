"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { X } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { NearbyVolumeSuggestions, useCartPricingInsights } from "./CartPricingInformation";
import type { CartItem } from "@/types";

const money = (value: number) => `$${value.toLocaleString("es-CL")}`;
const emptyItems: CartItem[] = [];

export function ComboSelectionDialog() {
  const selection = useCartStore((state) => state.comboSelection);
  const apply = useCartStore((state) => state.applyComboSelection);
  const changeQuantity = useCartStore((state) => state.updateComboSelectionQuantity);
  const cancel = useCartStore((state) => state.cancelComboSelection);
  const dialog = useRef<HTMLDialogElement>(null);
  const pointerStartedOutside = useRef(false);
  const revision = selection?.revision;
  const isOpen = revision !== undefined;
  const insights = useCartPricingInsights(selection?.previewItems ?? emptyItems, selection?.total ?? 0);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (revision !== undefined) {
      if (!element.open) {
        element.showModal();
        if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          gsap.fromTo(element, { x: "100%" }, { x: "0%", duration: 0.3, ease: "power3.out" });
        }
      }
      element.querySelector<HTMLHeadingElement>("h2")?.focus();
    } else if (element.open) element.close();
    return () => {
      gsap.killTweensOf(element);
      // Effect replay / Fast Refresh must not leave a half-translated panel.
      gsap.set(element, { clearProps: "transform" });
    };
  }, [revision]);

  useEffect(() => {
    if (!isOpen) return;
    // Reuse Catálogo's body lock without releasing an underlying cart's lock.
    const alreadyLocked = document.body.classList.contains("no-scroll");
    document.body.classList.add("no-scroll");
    return () => {
      if (!alreadyLocked) document.body.classList.remove("no-scroll");
    };
  }, [isOpen]);

  const isOutsidePanel = (event: React.MouseEvent<HTMLDialogElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return event.target === event.currentTarget && (
      event.clientX < bounds.left || event.clientX > bounds.right ||
      event.clientY < bounds.top || event.clientY > bounds.bottom
    );
  };

  const leftovers = selection?.previewItems.filter((item) => !item.isPromo) ?? [];
  const selectedCount = selection?.options.reduce((sum, option) => sum + option.selectedQuantity, 0) ?? 0;

  return (
    <dialog
      ref={dialog}
      aria-labelledby="combo-selection-title"
      aria-describedby="combo-selection-description"
      onCancel={(event) => { event.preventDefault(); cancel(); }}
      onPointerDown={(event) => { pointerStartedOutside.current = isOutsidePanel(event); }}
      onClick={(event) => {
        if (pointerStartedOutside.current && isOutsidePanel(event)) cancel();
        pointerStartedOutside.current = false;
      }}
      className="fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-none w-full max-w-2xl overflow-hidden overscroll-none rounded-none border-0 bg-background p-0 text-text-primary shadow-2xl backdrop:bg-black/40"
    >
      {selection && (
        <div className="flex h-full min-h-0 flex-col">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3 sm:px-6">
            <h2 id="combo-selection-title" tabIndex={-1} className="text-3xl font-bold leading-tight outline-none">Elegí tus combos</h2>
            <button type="button" onClick={cancel} aria-label="Cerrar selección de combos"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
              <X size={24} aria-hidden="true" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">
            <p id="combo-selection-description" className="mb-4 text-xl leading-relaxed">
              Usá + y − para elegir cuántos aplicar. Solo se usan productos de tu carrito.
            </p>
            <div className="grid gap-3" aria-label="Combos disponibles">
              {selection.options.map((option, index) => {
                const unavailable = option.maxQuantity === 0;
                const atMaximum = option.selectedQuantity >= option.maxQuantity;
                return (
                  <section
                    key={option.id}
                    aria-labelledby={`combo-name-${index}`}
                    className={`rounded-xl border-2 p-4 text-xl leading-relaxed ${unavailable ? "border-gray-300 bg-gray-100 text-gray-600" : option.selectedQuantity > 0 ? "border-brand bg-[#FBF4EF]" : "border-border bg-surface"}`}
                  >
                    <h3 id={`combo-name-${index}`} className="text-2xl font-bold">{option.promotion.title}</h3>
                    <p className="mt-1">
                      Por combo: {option.promotion.items.map((item) => `${item.quantity} × ${item.name}`).join(" + ")}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-bold">Elegidos: {option.selectedQuantity}</p>
                        <p className="text-lg">Máximo disponible: {option.maxQuantity}</p>
                      </div>
                      <div className="flex items-center gap-3" role="group" aria-label={`Cantidad de ${option.promotion.title}`}>
                        <button
                          type="button"
                          disabled={option.selectedQuantity === 0}
                          onClick={() => changeQuantity(option.id, option.selectedQuantity - 1, selection.revision)}
                          aria-label={`Quitar una repetición de ${option.promotion.title}`}
                          className="h-12 w-12 rounded-lg border-2 border-brand bg-surface text-3xl font-bold text-brand disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400"
                        >−</button>
                        <output className="min-w-8 text-center text-2xl font-bold" aria-live="polite">{option.selectedQuantity}</output>
                        <button
                          type="button"
                          disabled={atMaximum}
                          onClick={() => changeQuantity(option.id, option.selectedQuantity + 1, selection.revision)}
                          aria-label={`Agregar una repetición de ${option.promotion.title}`}
                          className="h-12 w-12 rounded-lg bg-brand text-3xl font-bold text-white disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
                        >+</button>
                      </div>
                    </div>
                    {unavailable ? (
                      <p className="mt-2 text-lg font-semibold">Faltan productos para este combo con la selección actual.</p>
                    ) : atMaximum ? (
                      <p className="mt-2 text-lg">No quedan productos para sumar otra repetición.</p>
                    ) : null}
                  </section>
                );
              })}
            </div>
            <div className="mt-4 text-lg leading-relaxed">
              <p className="font-bold">Productos fuera de los combos:</p>
              <p>{leftovers.length ? leftovers.map((item) => `${item.quantity} × ${item.name}`).join(" · ") : "Ninguno"}</p>
            </div>
            {selection.applyLimitation && <p className="mt-3 text-lg leading-snug text-amber-800">{selection.applyLimitation}</p>}
          </div>
          <div className="shrink-0 border-t border-border bg-surface px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
            <div className="mb-3 space-y-1" aria-live="polite">
              <p className="text-2xl font-bold">Total con esta selección: {money(selection.total)}</p>
              {insights.comparison ? <>
                <p className="text-lg">Sin combos: {money(insights.comparison.withoutCombos)}</p>
                {(insights.comparison.difference !== 0 || insights.suggestions.length > 0) && (
                  <div className={`space-y-1 text-lg font-semibold ${insights.comparison.difference > 0 ? "text-amber-800" : "text-text-secondary"}`}>
                    {insights.comparison.difference !== 0 && <p>
                      {money(Math.abs(insights.comparison.difference))} {insights.comparison.difference > 0 ? "más" : "menos"} que sin combos.
                      {insights.comparison.difference > 0 && insights.comparison.lostVolumeBrands.length > 0 && " Se pierde precio por volumen en los productos restantes."}
                    </p>}
                    <NearbyVolumeSuggestions insights={insights} items={selection.previewItems} compact />
                  </div>
                )}
              </> : <p className="text-lg">{insights.limitation}</p>}
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={cancel} className="min-h-12 flex-1 rounded-xl border-2 border-brand px-4 py-3 text-xl font-bold text-brand transition-colors hover:bg-brand/5">
                Cancelar
              </button>
              <button
                type="button"
                disabled={selectedCount === 0 || !!selection.applyLimitation}
                onClick={() => apply(selection.revision)}
                className="min-h-12 flex-1 rounded-xl bg-brand px-4 py-3 text-xl font-bold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600"
              >
                Aplicar selección
              </button>
            </div>
            <p className="mt-2 text-lg leading-relaxed">
              {selectedCount === 0 ? "Elegí al menos una repetición para aplicar."
                : selection.applyLimitation ? "Revisá el ajuste manual indicado para aplicar esta selección."
                : `Se aplican solo las ${selectedCount} repeticiones elegidas.`}
            </p>
          </div>
        </div>
      )}
    </dialog>
  );
}
