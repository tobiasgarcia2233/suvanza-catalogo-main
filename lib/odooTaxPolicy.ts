import 'server-only';
import type { Call } from './odooQuotation';

export type SalesTaxPolicy = {
  version: 1;
  kind: 'explicit_zero_sales_tax';
  taxId: number;
  validatedAt: string;
};

export type SalesTaxAdoption = {
  version: 1;
  at: string;
  actor: 'system:odoo_export';
  source: 'configured_zero_sales_tax';
  originalSnapshot: string;
  originalPayload: string | null;
  originalPricingData: string | null;
};

const CONFIG_ERROR = 'Configurá ODOO_SALES_TAX_ID con el ID del impuesto IVA 0% de ventas de SUVANZA (empresa 1). Debe estar activo, ser porcentual, tener tasa exactamente 0% y no contener impuestos hijos. No se enviará el presupuesto sin ese impuesto.';

/** Revalidate pinned policies; never substitute the current setting for a saved ID. */
export async function validateSalesTax(call: Call, policy?: SalesTaxPolicy): Promise<SalesTaxPolicy> {
  if (policy !== undefined && (!policy || typeof policy !== 'object' || policy.version !== 1 || policy.kind !== 'explicit_zero_sales_tax' ||
    typeof policy.validatedAt !== 'string' || !Number.isFinite(Date.parse(policy.validatedAt)))) {
    throw new Error('La política de IVA guardada no es válida. Requiere revisión del snapshot; no se reemplazará automáticamente.');
  }
  const taxId = policy === undefined ? Number(process.env.ODOO_SALES_TAX_ID) : policy.taxId;
  if (!Number.isSafeInteger(taxId) || taxId <= 0) throw new Error(CONFIG_ERROR);
  let rows: {id:number; name:string; active:boolean; company_id:[number,string]; type_tax_use:string; amount_type:string; amount:number; children_tax_ids:number[]}[];
  try {
    rows = await call('account.tax','search_read',{
      domain:[['id','=',taxId],['active','in',[true,false]]],
      fields:['id','name','active','company_id','type_tax_use','amount_type','amount','children_tax_ids'], limit:2,
    });
  } catch {
    throw new Error(`No se pudo verificar el IVA 0% en Odoo. Revisá la conexión, los permisos de lectura de account.tax y ODOO_SALES_TAX_ID; luego reintentá. No se creará el presupuesto.`);
  }
  const tax = Array.isArray(rows) && rows.length === 1 ? rows[0] : undefined;
  if (!tax || tax.id !== taxId || tax.name !== 'IVA 0%' || tax.active !== true || tax.company_id?.[0] !== 1 ||
    tax.type_tax_use !== 'sale' || tax.amount_type !== 'percent' || tax.amount !== 0 ||
    !Array.isArray(tax.children_tax_ids) || tax.children_tax_ids.length !== 0) throw new Error(CONFIG_ERROR);
  return policy ?? {version:1,kind:'explicit_zero_sales_tax',taxId,validatedAt:new Date().toISOString()};
}
