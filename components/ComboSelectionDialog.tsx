"use client";

import { useEffect, useRef } from "react";
import { useCartStore } from "@/store/cartStore";

const money = (value: number) => `$${value.toLocaleString("es-CL")}`;

export function ComboSelectionDialog() {
  const selection = useCartStore((state) => state.comboSelection);
  const apply = useCartStore((state) => state.applyComboSelection);
  const changeQuantity = useCartStore((state) => state.updateComboSelectionQuantity);
  const cancel = useCartStore((state) => state.cancelComboSelection);
  const hasManualCombos = useCartStore((state) => state.items.some((item) => item.isPromo &&
    (item.manualPercentage > 0 || item.manualPricePerUnit != null || item.manualTotal != null)));
  const dialog = useRef<HTMLDialogElement>(null);
  const revision = selection?.revision;

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (revision !== undefined) {
      if (!element.open) element.showModal();
      element.querySelector<HTMLHeadingElement>("h2")?.focus();
    } else if (element.open) element.close();
  }, [revision]);

  const leftovers = selection?.previewItems.filter((item) => !item.isPromo) ?? [];
  const selectedCount = selection?.options.reduce((sum, option) => sum + option.selectedQuantity, 0) ?? 0;

  return (
    <dialog
      ref={dialog}
      aria-labelledby="combo-selection-title"
      aria-describedby="combo-selection-description"
      onCancel={(event) => { event.preventDefault(); cancel(); }}
      className="fixed inset-0 m-auto max-h-[74dvh] w-[86vw] max-w-2xl overflow-hidden rounded-2xl bg-background p-0 text-text-primary shadow-2xl backdrop:bg-black/50"
    >
      {selection && (
        <div className="flex max-h-[74dvh] flex-col">
          <div className="shrink-0 px-5 pt-5 pb-3">
            <h2 id="combo-selection-title" tabIndex={-1} className="text-3xl font-bold outline-none">
              Elegí tus combos
            </h2>
            <p id="combo-selection-description" className="mt-2 text-xl leading-relaxed">
              Usá + y − para elegir cuántos aplicar. Solo se usan productos de tu carrito.
            </p>
          </div>
          <div className="min-h-0 overflow-y-auto px-5 pb-4">
            {hasManualCombos && (
              <p className="mb-4 rounded-lg bg-[#FBF4EF] p-3 text-lg leading-relaxed">
                Los combos con precio o descuento manual se conservan. Para cambiarlos,
                primero quitá su ajuste manual en el carrito.
              </p>
            )}
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
              <p className="mt-2">Estos productos quedan sin combo. No se agregan otros combos automáticamente.</p>
            </div>
          </div>
          <div className="shrink-0 border-t border-border bg-background px-5 py-4">
            <p className="mb-3 text-2xl font-bold" aria-live="polite">Total del carrito: {money(selection.total)}</p>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={cancel} className="min-h-12 flex-1 rounded-lg border-2 border-brand px-4 py-3 text-xl font-bold text-brand">
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => apply(selection.revision)}
                className="min-h-12 flex-1 rounded-lg bg-brand px-4 py-3 text-xl font-bold text-white"
              >
                Aplicar selección
              </button>
            </div>
            <p className="mt-2 text-lg leading-relaxed">
              {selectedCount === 0 ? "Sin combos seleccionados: se conservan los productos fuera de combos." : `Se aplican solo las ${selectedCount} repeticiones elegidas.`}
            </p>
            {hasManualCombos && <p className="mt-2 text-lg">Cancelar quita también los descuentos manuales de los combos.</p>}
          </div>
        </div>
      )}
    </dialog>
  );
}
