import { getAllSellers } from "@/lib/sellerQueries";
import { getSellerSalesStats } from "@/lib/orderQueries";
import SellersManager from "@/components/admin/SellersManager";

export const dynamic = "force-dynamic";

export default async function AdminSellersPage() {
  const sellers = await getAllSellers();
  const sellersWithStats = await Promise.all(
    sellers.map(async (seller) => ({
      ...seller,
      ...(await getSellerSalesStats(seller.name)),
    })),
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Vendedores</h1>
        <p className="text-sm text-gray-500">
          {sellers.length} vendedor{sellers.length === 1 ? "" : "es"} con acceso.
          Cada uno recibe un link propio para armar y gestionar sus pedidos sin
          necesidad de iniciar sesión.
        </p>
      </div>
      <SellersManager initialSellers={sellersWithStats} />
    </div>
  );
}
