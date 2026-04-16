"use client";

import { Product } from "@/types";
import Image from "next/image";
import { useUIStore } from "@/store/uiStore";
// MODIFIED: Import the correct product card component
import { CatalogProductCard } from "./CatalogProductCard";

interface CatalogViewProps {
  products: Product[];
}

// A component for products with multiple, distinct variants (e.g., Xela Rederm)
// NOTE: I've kept the description you added here.
function MultiVariantProductSection({ product }: { product: Product }) {
  const { openProductDetail } = useUIStore();
  return (
    <div
      onClick={() => openProductDetail(product)}
      className="bg-white hover:shadow-lg p-8 rounded-2xl transition-shadow cursor-pointer"
    >
      <div className="flex md:flex-row flex-col items-center gap-8">
        <div className="w-full md:w-1/3">
          <Image
            src={product.imageUrls[0]}
            alt={product.name}
            width={400}
            height={400}
            className="rounded-lg object-contain"
          />
        </div>
        <div className="w-full md:w-2/3">
          <h3 className="font-bold text-3xl">{product.brand}</h3>
          <p className="mb-4 text-text-secondary text-lg">{product.name}</p>
          <p className="mb-4 text-text-secondary text-base">
            {" "}
            {/* Added description */}
            {product.description}
          </p>
          <div className="gap-4 grid grid-cols-1 sm:grid-cols-3">
            {product.variants?.map((variant) => (
              <div
                key={variant.id}
                className="p-4 border rounded-lg text-center"
              >
                <p className="font-bold text-lg">{variant.name}</p>
                <p className="mt-2 font-extrabold text-brand text-xl">
                  $
                  {(variant.priceTiers?.[0]?.pricePerUnit || 0).toLocaleString(
                    "es-CL"
                  )}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// A component for products with a long list of variants (e.g., Hilos, Cánulas)
function ProductTableSection({ product }: { product: Product }) {
  const { openProductDetail } = useUIStore();
  return (
    <div
      onClick={() => openProductDetail(product)}
      className="bg-gray-50 hover:shadow-lg p-8 rounded-2xl transition-shadow cursor-pointer"
    >
      <h3 className="font-bold text-3xl">{product.brand}</h3>
      <p className="mb-6 text-text-secondary text-lg">{product.name}</p>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="border-b">
            <tr>
              <th className="p-2 font-semibold">Modelo</th>
              <th className="p-2 font-semibold text-right">Precio</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {product.variants?.map((variant) => (
              <tr key={variant.id}>
                <td className="p-2">{variant.name}</td>
                <td className="p-2 font-bold text-brand text-right">
                  $
                  {(variant.priceTiers?.[0]?.pricePerUnit || 0).toLocaleString(
                    "es-CL"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- The Main Catalog View Component ---

export function CatalogView({ products }: CatalogViewProps) {
  if (!products || products.length === 0) {
    return <div>Cargando productos...</div>;
  }

  return (
    <div className="space-y-16 w-full">
      {/* --- All Products Section --- */}
      <div>
        <div className="space-y-12">
          {products.map((product) => {
            const variantCount = product.variants?.length || 0;

            // Rule: Use a table for products with many variants
            if (variantCount > 5) {
              return <ProductTableSection key={product.id} product={product} />;
            }
            // Rule: Use the multi-variant view for products with a few distinct options
            if (variantCount > 1) {
              return (
                <MultiVariantProductSection
                  key={product.id}
                  product={product}
                />
              );
            }
            // MODIFIED: Use the new CatalogProductCard with the slider for single-variant products
            return <CatalogProductCard key={product.id} product={product} />;
          })}
        </div>
      </div>
    </div>
  );
}
