import 'server-only';
import type { Client } from '@libsql/client';
import type { CartItem, CrossPromotion, Order, PriceTier } from '@/types';
import { confirmedCatalogueDateEligible } from './pricingRecovery';
import { allocateComboSelection, matchesRequirement, isComboSelectionUnambiguous } from './comboSelection';
import { checkoutItems, validatePromotion } from './checkoutPricing';
import { cents, extendedCents } from './money';
import { quantityPricingKey } from './cartMoney';

export type RecoveryVariant={id:string;name:string;brand:string;parentName:string;priceTiers:PriceTier[]};
export type RecoveryCatalogue={variants:RecoveryVariant[];promotions:CrossPromotion[]};

/** Read a consistent, uncached catalogue revision from the injected database. */
export async function loadRecoveryCatalogue(client:Client,order:Order):Promise<RecoveryCatalogue> {
  const ids=[...new Set(order.items.map(i=>String(i.id)))].sort();
  const promoIds=[...new Set((order.promos_sold ?? []).map(p=>p.id))].sort();
  if(!ids.length||!promoIds.length)throw new Error('Falta identificar los productos o promociones vendidos. Requiere revisión del pedido original.');
  const markers=(values:unknown[])=>values.map(()=>'?').join(',');
  const tx=await client.transaction('read');
  try {
    const [products,variants,tiers,promos,parts]=await Promise.all([
      tx.execute({sql:`SELECT id,name,brand FROM products WHERE id IN (${markers(ids)}) OR id IN (SELECT product_id FROM variants WHERE id IN (${markers(ids)})) ORDER BY id`,args:[...ids,...ids]}),
      tx.execute({sql:`SELECT id,product_id,name FROM variants WHERE id IN (${markers(ids)}) ORDER BY id`,args:ids}),
      tx.execute({sql:`SELECT id,product_id,variant_id,min_quantity,price_per_unit FROM price_tiers WHERE variant_id IN (${markers(ids)}) OR (variant_id IS NULL AND product_id IN (${markers(ids)})) ORDER BY position,min_quantity,id`,args:[...ids,...ids]}),
      tx.execute({sql:`SELECT id,title,total_price,is_promo FROM promotions WHERE id IN (${markers(promoIds)}) ORDER BY id`,args:promoIds}),
      tx.execute({sql:`SELECT promotion_id,item_id,item_name,brand,quantity,price_per_unit,match_by FROM promotion_items WHERE promotion_id IN (${markers(promoIds)}) ORDER BY promotion_id,position,id`,args:promoIds}),
    ]);
    const result:RecoveryCatalogue={variants:ids.map(id=>{
      const variant=variants.rows.find(v=>String(v.id)===id);
      const parent=products.rows.find(p=>String(p.id)===(variant ? String(variant.product_id):id));
      if(!parent)throw new Error('Uno de los productos comprados ya no está en el catálogo. Requiere revisión del pedido original.');
      const prices=tiers.rows.filter(t=>variant ? String(t.variant_id)===id : t.variant_id==null&&String(t.product_id)===id);
      return {id,name:String(variant?.name ?? parent.name),brand:String(parent.brand ?? ''),parentName:String(parent.name),priceTiers:prices.map(t=>({minQuantity:Number(t.min_quantity),pricePerUnit:Number(t.price_per_unit)}))};
    }),promotions:promos.rows.map(p=>({id:String(p.id),title:String(p.title),totalPrice:Number(p.total_price),isPromo:!!p.is_promo,
      items:parts.rows.filter(i=>i.promotion_id===p.id).map(i=>({id:String(i.item_id),name:String(i.item_name),brand:i.brand ? String(i.brand):undefined,quantity:Number(i.quantity),pricePerUnit:Number(i.price_per_unit),matchBy:i.match_by ? String(i.match_by):undefined})),
    }))};
    await tx.commit();return result;
  } finally {tx.close();}
}

/** Recover only the recorded promotion selection. The owner confirmed these
 * prices unchanged since Oct 15; do not discover new promos or infer discounts. */
export function reconstructConfirmedCatalogue(order:Order,catalogue:RecoveryCatalogue):Order['items'] {
  if(!confirmedCatalogueDateEligible(order.created_at))throw new Error('La confirmación de precios solo cubre compras desde el 15/10/2026 (hora argentina).');
  const quantities=new Map<string,number>();
  for(const item of order.items){
    if(!Number.isSafeInteger(item.quantity)||item.quantity<=0)throw new Error('Cantidad original inválida. Requiere revisión.');
    quantities.set(item.id,(quantities.get(item.id) ?? 0)+item.quantity);
  }
  const loose:CartItem[]=[...quantities].sort(([a],[b])=>a.localeCompare(b)).map(([id,quantity])=>{
    const variant=catalogue.variants.find(v=>v.id===id);
    if(!variant)throw new Error('Falta un producto comprado en el catálogo confirmado.');
    const purchased=order.items.find(i=>i.id===id)!;
    if(order.items.some(i=>i.id===id&&i.brand!==purchased.brand) || purchased.brand && purchased.brand!==variant.brand)throw new Error('La marca de un producto no coincide con la compra original. Requiere revisión de su escala.');
    return {id,name:purchased.name,brand:purchased.brand || variant.brand,quantity,priceTiers:variant.priceTiers,imageUrls:[],discountPercentage:0,manualPercentage:0,manualTotal:null};
  });
  const counts:Record<string,number>=Object.create(null);
  for(const p of order.promos_sold ?? []){
    if(!Number.isSafeInteger(p.quantity)||p.quantity<=0)throw new Error('Repeticiones originales de promoción inválidas.');
    counts[p.id]=(counts[p.id] ?? 0)+p.quantity;
  }
  if(!Object.keys(counts).length)throw new Error('No se guardó qué promociones se vendieron. Requiere revisión del respaldo original.');
  const selected=Object.keys(counts).sort().map(id=>{
    const p=catalogue.promotions.find(p=>p.id===id);
    if(!p)throw new Error('Una promoción vendida ya no está disponible en el catálogo confirmado.');
    validatePromotion(p);
    return {...p,items:p.items.map(row=>{
      let matches=loose.filter(item=>matchesRequirement(item,row));
      if(!matches.length && !row.matchBy){
        // Old explicit bundles sometimes referenced a name/parent instead of a
        // concrete variant ID. Accept only one purchased variant, never guess.
        const name=row.name.toLowerCase();
        matches=loose.filter(item=>{
          const v=catalogue.variants.find(v=>v.id===String(item.id))!;
          return [v.name,v.parentName,v.brand].some(value=>value.toLowerCase()===name);
        });
      }
      if(!matches.length || matches.length>1 && !row.matchBy)throw new Error('La promoción no identifica una variante comprada de forma unívoca. Requiere revisión para no elegir una variante incorrecta.');
      return matches.length===1 ? {...row,id:String(matches[0].id),matchBy:undefined} : row;
    })};
  });
  if(!isComboSelectionUnambiguous(loose,selected,counts))throw new Error('La asignación de productos a promociones es ambigua o no coincide con las cantidades compradas. Requiere revisión; no se elegirá una variante automáticamente.');
  const allocated=allocateComboSelection(loose,selected,counts);
  if(!allocated)throw new Error('Las promociones registradas requieren más unidades de las compradas. Requiere revisión.');
  const extras=allocated.filter(i=>!i.isPromo);
  const extraCounts=new Map<string,number>();
  for(const item of extras){const key=quantityPricingKey(item);extraCounts.set(key,(extraCounts.get(key) ?? 0)+item.quantity);}
  const priced=allocated.map(item=>{
    if(item.isPromo)return {...item,customTotal:extendedCents(item.promotionTotal!,item.quantity)/100};
    const tiers=item.priceTiers;
    if(!tiers.length||tiers.some(t=>!Number.isSafeInteger(t.minQuantity)||t.minQuantity<=0||!Number.isFinite(t.pricePerUnit)||t.pricePerUnit<0))throw new Error('Falta una escala válida para las unidades extra en el catálogo confirmado.');
    const tierQuantity=extraCounts.get(quantityPricingKey(item))!;
    let unit=tiers[0].pricePerUnit;
    for(const tier of tiers)if(tierQuantity>=tier.minQuantity)unit=tier.pricePerUnit;
    return {...item,tierQuantity,customTotal:extendedCents(unit,item.quantity)/100};
  });
  const proposed=priced.reduce((sum,i)=>sum+cents(i.customTotal!),0)/100;
  if(cents(proposed)!==cents(order.total))throw new Error(`Los precios confirmados reconstruyen ${proposed.toFixed(2)}, pero el total original es ${order.total.toFixed(2)}. Puede haber un ajuste manual o un cambio de composición; requiere revisión. No se cambiará el importe cobrado.`);
  return checkoutItems(priced,order.total);
}
