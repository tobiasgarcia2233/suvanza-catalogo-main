'use client';
import { useEffect, useState } from 'react';
import type { ExportProgress } from '@/lib/odooExport';
import { exportAction, parseExportResponse, needsHistoricalPricingReview, canRecompareCustomer } from '@/lib/odooExportStatus';

/**
 * Local Odoo export state of one order, read from odoo_exports through
 * /api/orders/[id]/finalize. Shared by OdooExportStatus (/odoo) and OdooModal
 * (order cards) so both act on the outbox exactly the same way.
 */
export function useOdooExport(orderId: string) {
  const [progress,setProgress] = useState<ExportProgress|null>(null);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [readError,setReadError] = useState('');
  const [reading,setReading] = useState(true);
  const [refresh,setRefresh] = useState(0);
  useEffect(()=>{setProgress(null);setError('');setReadError('');},[orderId]);
  useEffect(()=>{
    let active=true;
    const controller = new AbortController();
    setReading(true);
    void (async()=>{
      try {
        const response = await fetch(`/api/orders/${orderId}/finalize`,{cache:'no-store',signal:controller.signal});
        const next = await parseExportResponse(response);
        if(active) {setProgress(next);setReadError('');}
      } catch(e) {
        if(active) setReadError(e instanceof Error ? e.message : 'No se pudo consultar la exportación.');
      } finally {if(active) setReading(false);}
    })();
    return ()=>{active=false;controller.abort();};
  },[orderId,refresh]);
  /** Resolves with the new state, or undefined when nothing was applied. */
  async function send(body: Record<string,unknown> = {}): Promise<{next:ExportProgress|null}|undefined> {
    if (busy || readError || reading || progress?.migration_required ||
      (Object.keys(body).length===0 && !exportAction(progress) && !canRecompareCustomer(progress))) return;
    setBusy(true);setError('');
    try {
      const r=await fetch(`/api/orders/${orderId}/finalize`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      const next=await parseExportResponse(r);
      setProgress(next);
      return {next};
    } catch(e){setError(e instanceof Error ? e.message:'No se pudo reintentar.');setReadError('Actualizá el estado antes de volver a actuar.');}finally{setBusy(false);}
  }
  const action = exportAction(progress,!!readError);
  const blocked = busy || reading || !!readError || !!progress?.migration_required;
  const canCorrect = !needsHistoricalPricingReview(progress) && !!progress?.customer_buyer && !progress.quotation_id && !progress.phase?.endsWith('creating') && progress.status !== 'exported' && progress.status !== 'processing';
  return {progress,busy,error,readError,reading,send,reload:()=>setRefresh(value=>value+1),action,blocked,canCorrect};
}
