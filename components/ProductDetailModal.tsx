"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import { useUIStore } from "@/store/uiStore";
import { useCartStore } from "@/store/cartStore";
import { useProductsStore } from "@/store/productsStore";
import { gsap } from "gsap";
import { Camera, ChevronDown, Gift, Tag, X } from "lucide-react";
import { PromotionBreakdown } from "./PromotionBreakdown";
import { VariantRow } from "./VariantRow";
import { NumberStepper } from "./ui/NumberStepper";

const fmt = (n: number) => `$${Math.round(n).toLocaleString("es-AR")}`;

function unitPriceForQty(
  tiers: { minQuantity: number; pricePerUnit: number }[],
  qty: number,
): number {
  const sorted = [...tiers].sort((a, b) => a.minQuantity - b.minQuantity);
  let price = sorted[0]?.pricePerUnit ?? 0;
  for (const t of sorted) if (qty >= t.minQuantity) price = t.pricePerUnit;
  return price;
}

export function ProductDetailModal() {
  const breakdownId = useId();
  const [expandedPromotions, setExpandedPromotions] = useState<Set<string>>(new Set());
  const panelRef = useRef<HTMLDivElement>(null);
  const {
    isDetailModalOpen,
    selectedProduct,
    closeProductDetail,
    openGalleryModal,
  } = useUIStore();
  const { addMultipleToCart, addCrossPromotionToCart } = useCartStore();
  const products = useProductsStore((s) => s.products);
  useEffect(() => { setExpandedPromotions(new Set()); }, [isDetailModalOpen, selectedProduct]);

  const [variantQuantities, setVariantQuantities] = useState<
    Map<string, string>
  >(new Map());
  const [comboQuantities, setComboQuantities] = useState<Map<string, number>>(
    new Map(),
  );

  useEffect(() => {
    if (isDetailModalOpen) {
      gsap.to(panelRef.current, { x: "0%", duration: 0.3, ease: "power3.out" });
      setVariantQuantities(new Map());
      setComboQuantities(new Map());
    } else {
      gsap.to(panelRef.current, { x: "100%", duration: 0.3, ease: "power3.in" });
    }
  }, [isDetailModalOpen]);

  const variants = useMemo(
    () => selectedProduct?.variants ?? [],
    [selectedProduct],
  );

  const heroImages = useMemo(() => {
    if (!selectedProduct) return [] as string[];
    const top = selectedProduct.imageUrls ?? [];
    if (top.length > 0) return top;
    return variants.flatMap((v) => v.imageUrls ?? []);
  }, [selectedProduct, variants]);

  const priceRange = useMemo(() => {
    if (!selectedProduct) return { min: 0, max: 0 };
    const prices = (
      variants.length > 0
        ? variants.flatMap((v) => v.priceTiers?.map((t) => t.pricePerUnit) ?? [])
        : selectedProduct.priceTiers.map((t) => t.pricePerUnit)
    ).filter((n) => n > 0);
    return prices.length
      ? { min: Math.min(...prices), max: Math.max(...prices) }
      : { min: 0, max: 0 };
  }, [selectedProduct, variants]);

  const selection = useMemo(() => {
    let units = 0;
    let total = 0;
    for (const v of variants) {
      const qty = Math.max(0, parseInt(variantQuantities.get(v.id) ?? "", 10) || 0);
      if (qty <= 0) continue;
      units += qty;
      total += qty * unitPriceForQty(v.priceTiers ?? [], qty);
    }

    let comboUnits = 0;
    for (const promo of selectedProduct?.crossProductPromotions ?? []) {
      const qty = comboQuantities.get(promo.id) ?? 0;
      if (qty <= 0) continue;
      comboUnits += qty;
      total += qty * promo.totalPrice;
    }

    return { units, comboUnits, total };
  }, [variants, variantQuantities, selectedProduct, comboQuantities]);

  if (!selectedProduct) return null;

  const handleVariantQuantityChange = (variantId: string, value: string) => {
    setVariantQuantities((prev) => new Map(prev).set(variantId, value));
  };

  const handleAddToCart = () => {
    const quantities = new Map<string, number>();
    variantQuantities.forEach((value, id) => {
      const qty = parseInt(value, 10);
      if (!isNaN(qty) && qty > 0) quantities.set(id, qty);
    });

    let addedAnything = false;
    if (quantities.size > 0) {
      addMultipleToCart(selectedProduct, quantities);
      addedAnything = true;
    }

    for (const promo of selectedProduct.crossProductPromotions ?? []) {
      const qty = comboQuantities.get(promo.id) ?? 0;
      if (qty > 0) {
        // replaceLooseItems=false: no piso las variantes que se agregan en la
        // misma tanda ni lo que el cliente ya tenía suelto en el carrito.
        addCrossPromotionToCart(promo, qty, false);
        addedAnything = true;
      }
    }

    if (addedAnything) closeProductDetail();
  };

  const handleVolumeClick = (quantity: number) => {
    const firstVariantId = variants[0]?.id;
    if (firstVariantId) {
      handleVariantQuantityChange(firstVariantId, quantity.toString());
    }
  };

  const setComboQuantity = (promoId: string, qty: number) => {
    setComboQuantities((prev) => {
      const next = new Map(prev);
      next.set(promoId, Math.max(0, qty));
      return next;
    });
  };

  const thumbFor = (name: string): string | undefined => {
    const n = name.trim().toLowerCase();
    for (const p of products) {
      if (p.name.toLowerCase() === n || p.brand?.toLowerCase() === n) {
        return p.variants?.[0]?.imageUrls?.[0] ?? p.imageUrls?.[0];
      }
      for (const v of p.variants ?? []) {
        if (v.name.toLowerCase() === n) return v.imageUrls?.[0] ?? p.imageUrls?.[0];
      }
    }
    return undefined;
  };

  const volumeTiers = (variants[0]?.priceTiers ?? []).filter(
    (t) => t.minQuantity > 1,
  );
  const volumeBase = variants[0]?.priceTiers?.[0]?.pricePerUnit ?? 0;
  const crossPromotions = selectedProduct.crossProductPromotions ?? [];
  const categories = selectedProduct.categoryNames ?? [];

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-end ${
        isDetailModalOpen ? "" : "pointer-events-none"
      }`}
    >
      {/* Backdrop */}
      <div
        onClick={closeProductDetail}
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${
          isDetailModalOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="pointer-events-auto relative flex h-full w-full max-w-2xl translate-x-full flex-col bg-background shadow-2xl"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3">
          <p className="truncate text-sm font-bold uppercase tracking-[0.2em] text-text-secondary">
            {selectedProduct.brand || "Producto"}
          </p>
          <button
            onClick={closeProductDetail}
            className="rounded-full p-2 text-text-secondary transition-colors hover:bg-gray-100"
            aria-label="Cerrar"
          >
            <X size={24} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-grow overflow-y-auto">
          {/* Hero */}
          <div className="relative aspect-[4/3] w-full bg-gray-100 sm:aspect-[16/10]">
            {heroImages.length > 0 ? (
              <Swiper
                key={selectedProduct.id}
                modules={[Pagination]}
                pagination={{ clickable: true }}
                loop={heroImages.length > 1}
                className="h-full w-full [--swiper-pagination-bottom:12px] [--swiper-pagination-color:#fff]"
              >
                {heroImages.map((src, i) => (
                  <SwiperSlide key={`${src}-${i}`}>
                    <button
                      type="button"
                      onClick={() =>
                        openGalleryModal({
                          images: heroImages,
                          title: selectedProduct.name,
                        })
                      }
                      className="relative block h-full w-full"
                    >
                      <Image
                        src={src}
                        alt={selectedProduct.name}
                        fill
                        sizes="(max-width: 768px) 100vw, 42rem"
                        className="object-cover"
                        priority={i === 0}
                      />
                    </button>
                  </SwiperSlide>
                ))}
              </Swiper>
            ) : (
              <div className="flex h-full items-center justify-center text-gray-400">
                <Camera size={48} />
              </div>
            )}
          </div>

          {/* Title block */}
          <div className="border-b border-border px-4 pb-5 pt-4 sm:px-6">
            {categories.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-1.5">
                {categories.map((c) => (
                  <span
                    key={c}
                    className="rounded-full bg-brand/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-brand"
                  >
                    {c}
                  </span>
                ))}
              </div>
            )}
            <h2 className="text-3xl font-bold leading-tight text-text-primary sm:text-4xl">
              {selectedProduct.name}
            </h2>
            {priceRange.min > 0 && (
              <p className="mt-3 flex items-baseline gap-2">
                {priceRange.min !== priceRange.max && (
                  <span className="text-base text-text-secondary">Desde</span>
                )}
                <span className="text-2xl font-bold text-brand sm:text-3xl">
                  {fmt(priceRange.min)}
                </span>
                <span className="text-base text-text-secondary">/ unidad</span>
              </p>
            )}
          </div>

          {/* Variants */}
          {variants.length > 0 && (
            <div className="px-4 py-5 sm:px-6">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.15em] text-text-secondary">
                {variants.length === 1 ? "Presentación" : "Variantes"}
              </h3>
              <div className="space-y-3">
                {variants.map((variant) => (
                  <VariantRow
                    key={variant.id}
                    variant={variant}
                    quantity={variantQuantities.get(variant.id) || "0"}
                    onQuantityChange={(newValue) =>
                      handleVariantQuantityChange(variant.id, newValue)
                    }
                  />
                ))}
              </div>
            </div>
          )}

          {/* Carteles: volumen + combos */}
          {(volumeTiers.length > 0 || crossPromotions.length > 0) && (
            <div className="space-y-4 px-4 pb-6 sm:px-6">
              {volumeTiers.length > 0 && (
                <section className="overflow-hidden rounded-2xl border border-amber-300 bg-amber-50">
                  <header className="flex items-center gap-2 bg-amber-100 px-4 py-2.5 text-amber-900">
                    <Tag size={16} />
                    <span className="text-xs font-bold uppercase tracking-[0.15em]">
                      Precio por volumen
                    </span>
                  </header>
                  <div className="divide-y divide-amber-200">
                    {volumeTiers.map((tier) => {
                      const saving =
                        (volumeBase - tier.pricePerUnit) * tier.minQuantity;
                      return (
                        <button
                          key={tier.minQuantity}
                          onClick={() => handleVolumeClick(tier.minQuantity)}
                          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-amber-100"
                        >
                          <div>
                            <p className="text-base font-semibold text-amber-950">
                              Llevá {tier.minQuantity} o más
                            </p>
                            {saving > 0 && (
                              <p className="text-xs text-amber-700">
                                Ahorrás {fmt(saving)} en total
                              </p>
                            )}
                          </div>
                          <span className="shrink-0 text-lg font-bold text-amber-950">
                            {fmt(tier.pricePerUnit)}{" "}
                            <span className="text-sm font-medium">c/u</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}

              {crossPromotions.length > 0 && (
                <section className="overflow-hidden rounded-2xl border border-brand/30 bg-brand/5">
                  <header className="flex items-center gap-2 bg-brand/10 px-4 py-2.5 text-brand">
                    <Gift size={16} />
                    <span className="text-xs font-bold uppercase tracking-[0.15em]">
                      Combos con este producto
                    </span>
                  </header>
                  <div className="divide-y divide-brand/15">
                    {crossPromotions.map((promo) => {
                      const expanded = expandedPromotions.has(promo.id);
                      const detailsId = `${breakdownId}-${promo.id}`;
                      const qty = comboQuantities.get(promo.id) ?? 0;
                      return (
                        <div
                          key={promo.id}
                          className={`px-4 py-3.5 transition-colors ${
                            qty > 0 ? "bg-brand/10" : ""
                          }`}
                        >
                          <button type="button" aria-expanded={expanded} aria-controls={detailsId}
                            onClick={() => setExpandedPromotions((previous) => {
                              const next = new Set(previous);
                              if (next.has(promo.id)) next.delete(promo.id); else next.add(promo.id);
                              return next;
                            })}
                            className="flex w-full items-start justify-between gap-3 rounded-md text-left focus-visible:outline-2 focus-visible:outline-brand">
                            <span className="flex items-center gap-2 text-base font-bold text-text-primary">
                              {promo.title}
                              <ChevronDown size={18} aria-hidden="true" className={`shrink-0 ${expanded ? "rotate-180" : ""}`} />
                            </span>
                            <span className="shrink-0 text-right text-lg font-bold text-brand">
                              {fmt(promo.totalPrice)}
                            </span>
                          </button>
                          <ul className="mt-2 flex flex-wrap gap-2">
                            {promo.items.map((item, index) => {
                              const img = thumbFor(item.name);
                              return (
                                <li
                                  key={index}
                                  className="flex items-center gap-1.5 rounded-full bg-surface py-1 pl-1 pr-2.5 text-xs text-text-secondary shadow-sm"
                                >
                                  <span className="relative flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100">
                                    {img ? (
                                      <Image
                                        src={img}
                                        alt=""
                                        fill
                                        sizes="24px"
                                        className="object-cover"
                                      />
                                    ) : (
                                      <Camera size={12} className="text-gray-400" />
                                    )}
                                  </span>
                                  <span className="font-medium text-text-primary">
                                    {item.quantity}×
                                  </span>
                                  {item.name}
                                </li>
                              );
                            })}
                          </ul>
                          <div id={detailsId} hidden={!expanded} className="mt-3">
                            {expanded && <PromotionBreakdown promotion={promo} />}
                          </div>
                          <div className="mt-3 flex items-center justify-between gap-3">
                            <span className="min-w-0 text-xs text-text-secondary">
                              {qty > 0
                                ? `${qty} × ${fmt(promo.totalPrice)} = ${fmt(
                                    qty * promo.totalPrice,
                                  )}`
                                : "Elegí cuántos combos querés"}
                            </span>
                            <div className="w-24 shrink-0">
                              <NumberStepper
                                value={qty}
                                onCommit={(value) =>
                                  setComboQuantity(promo.id, value ?? 0)
                                }
                                min={0}
                                step={1}
                                className="w-full"
                                inputClassName="text-lg font-bold text-brand"
                                aria-label={`Cantidad de ${promo.title}`}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>

        {/* Sticky footer */}
        <div className="shrink-0 border-t border-border bg-surface px-4 py-3 sm:px-6">
          {(() => {
            const parts: string[] = [];
            if (selection.units > 0) {
              parts.push(
                `${selection.units} ${
                  selection.units === 1 ? "unidad" : "unidades"
                }`,
              );
            }
            if (selection.comboUnits > 0) {
              parts.push(
                `${selection.comboUnits} ${
                  selection.comboUnits === 1 ? "combo" : "combos"
                }`,
              );
            }
            const empty = parts.length === 0;
            return (
              <>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-text-secondary">
                    {empty ? "Elegí una cantidad" : parts.join(" + ")}
                  </span>
                  {!empty && (
                    <span className="text-lg font-bold text-text-primary">
                      {fmt(selection.total)}
                    </span>
                  )}
                </div>
                <button
                  onClick={handleAddToCart}
                  disabled={empty}
                  className="w-full rounded-xl bg-brand py-4 text-lg font-semibold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Agregar al carrito
                </button>
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
