"use server";

import { fetchRecentOrders } from "@/lib/orderQueries";

export async function getFreshOrders(
  query: string,
  startDate?: string,
  endDate?: string,
) {
  return fetchRecentOrders(query, startDate, endDate);
}
