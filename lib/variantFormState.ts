import type { Variant } from "@/types";

export type VariantFormState = Variant & { formKey: string; originalId: string };

export function variantFormState(variant?: Variant): VariantFormState {
  return {
    id: variant?.id ?? "",
    originalId: variant?.id ?? "",
    formKey: variant ? `saved:${variant.id}` : `new:${crypto.randomUUID()}`,
    name: variant?.name ?? "",
    odooProductId: variant?.odooProductId ?? null,
    imageUrls: variant?.imageUrls ?? [],
    priceTiers: variant?.priceTiers ?? [],
  };
}

export function serializeVariants(variants: VariantFormState[]) {
  return variants.map(({ formKey: _formKey, ...variant }) => variant);
}

export function moveVariant(variants: VariantFormState[], key: string, delta: number) {
  const index = variants.findIndex((v) => v.formKey === key);
  const target = index + delta;
  if (index < 0 || target < 0 || target >= variants.length) return variants;
  const next = [...variants];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
