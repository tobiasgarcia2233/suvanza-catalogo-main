import type { CartItem, Order } from '@/types';
/** Pending-order edits retain purchased manifests and deliberate adjustments. */
export function restorePricingCart(loaded:CartItem[], order:Order):CartItem[] {
  const result:CartItem[]=[];
  const groups=new Map<string,CartItem>();
  for (const [index,item] of loaded.entries()) {
    const p=order.items[index]?.pricing;
    if (!p) {result.push(item);continue;}
    if(p.kind==='extra') {
      result.push({...item,manualPercentage:p.adjustment?.manualPercentage ?? 0,manualPricePerUnit:p.adjustment?.manualPricePerUnit,manualTotal:p.adjustment?.manualTotal ?? null});
      continue;
    }
    const key=JSON.stringify([p.promotionId,p.allocationId]);
    let bundle=groups.get(key);
    if(!bundle) {
      bundle={id:`restored:${key}`,promoId:p.promotionId,name:order.promos_sold?.find(s=>s.id===p.promotionId)?.title ?? 'Promoción',brand:'Promoción',isPromo:true,comboSource:p.comboSource ?? 'explicit',quantity:p.repetitions!,promotionTotal:p.promotionTotal,priceTiers:[],imageUrls:[],includedItems:[],discountPercentage:0,manualPercentage:p.adjustment?.manualPercentage ?? 0,manualPricePerUnit:p.adjustment?.manualPricePerUnit,manualTotal:p.adjustment?.manualTotal ?? null};
      groups.set(key,bundle);result.push(bundle);
    }
    bundle.includedItems!.push({...item,quantity:p.quantityPerPromotion!,promotionUnitPrice:p.configuredUnitPrice,manualPercentage:0,manualPricePerUnit:null,manualTotal:null});
  }
  return result;
}
