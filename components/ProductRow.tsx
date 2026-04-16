"use client";

import { Product } from "@/types";
import Image from "next/image";
import { useUIStore } from "@/store/uiStore";
import { useCartStore } from "@/store/cartStore";
import { ShoppingBasket } from "lucide-react";

interface ProductRowProps {
  product: Product;
}

export function ProductRow({ product }: ProductRowProps) {
  const { openProductDetail } = useUIStore();
  // MODIFICATION: Use the correct function from the cart store
  const { addMultipleToCart } = useCartStore();

  // MODIFICATION: The logic now checks if there are MULTIPLE variants to choose from.
  const hasMultipleVariants = product.variants && product.variants.length > 1;

  // The base price can be taken from the first variant if it exists, or the product itself.
  const priceToDisplay =
    product.variants?.[0]?.priceTiers?.[0]?.pricePerUnit ||
    product.priceTiers[0]?.pricePerUnit ||
    0;

  const handleAddToCartClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    // If there are multiple variants, open the detail modal to choose.
    if (hasMultipleVariants) {
      openProductDetail(product);
    } else {
      // If there is only one variant (or none), add it directly to the cart.
      const variantId = product.variants?.[0]?.id || (product.id as string);
      if (!variantId) return; // Safety check

      const quantities = new Map<string, number>();
      quantities.set(variantId, 1);

      addMultipleToCart(product, quantities);
    }
  };

  return (
    <div
      onClick={() => openProductDetail(product)}
      className="group flex items-center gap-6 bg-surface hover:shadow-lg p-4 border border-border rounded-lg w-full transition-shadow cursor-pointer"
    >
      <div className="relative flex-shrink-0 w-24 h-24">
        <Image
          src={product.imageUrls[0]}
          alt={product.name}
          fill
          className="rounded-md object-center object-cover"
        />
      </div>

      <div className="flex-grow">
        <p className="font-bold text-text-secondary text-xs uppercase tracking-wider">
          {product.brand}
        </p>
        <h3 className="font-semibold text-text-primary text-lg">
          {product.name}
        </h3>
      </div>

      <div className="flex-shrink-0 w-40 text-right">
        <div className="flex justify-end items-baseline gap-2">
          {/* Show "Desde" only if there are multiple options with different prices */}
          {hasMultipleVariants && (
            <span className="text-text-secondary text-sm">Desde</span>
          )}
          <p className="font-bold text-brand text-xl">
            ${priceToDisplay.toLocaleString("es-CL")}
          </p>
        </div>
      </div>

      <div className="flex-shrink-0 w-24 text-right">
        <button
          onClick={handleAddToCartClick}
          className="bg-surface hover:bg-brand p-3 border border-border rounded-button text-text-secondary hover:text-white transition-colors duration-200"
        >
          <ShoppingBasket size={20} />
        </button>
      </div>
    </div>
  );
}
