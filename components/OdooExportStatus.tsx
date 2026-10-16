'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { useOdooExport } from './useOdooExport';
import OdooModal, { exportSummary } from './OdooModal';

const DOTS = { info: 'bg-sky-500', success: 'bg-green-600', warning: 'bg-orange-500', error: 'bg-red-500' } as const;

/**
 * One-line Odoo status for the /odoo cards. Resolving happens in OdooModal,
 * the same panel the order cards use.
 */
export function OdooExportStatus({orderId,buyerName,legacySent=false,onRetryAllowed}:{orderId:string;buyerName:string;legacySent?:boolean;onRetryAllowed?:(orderId:string,allowed:boolean)=>void}) {
  const router = useRouter();
  const {progress,readError,reading,reload,action,blocked} = useOdooExport(orderId);
  const [open,setOpen] = useState(false);
  useEffect(()=>{onRetryAllowed?.(orderId,action === 'retry' && !blocked);},[orderId,action,blocked,onRetryAllowed]);

  const summary = exportSummary(progress,legacySent);
  const title = reading && !progress ? 'Consultando estado…' : readError ? 'Estado no disponible' : summary.title;
  const tone = readError ? 'error' : summary.tone;
  const attention = summary.needsAction || !!readError;
  return <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm" aria-live="polite">
    <span className={`h-2 w-2 shrink-0 rounded-full ${DOTS[tone]}`} aria-hidden/>
    <span className="font-medium">Odoo: {title}</span>
    {progress?.quotation_ref && <span className="text-gray-500">· {progress.quotation_ref}</span>}
    <div className="ml-auto flex items-center gap-2">
      <button className="rounded p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-900 disabled:opacity-50" disabled={reading} onClick={reload} aria-label="Actualizar estado" title="Actualizar estado">
        <RefreshCw size={14} className={reading ? 'animate-spin' : ''}/>
      </button>
      <button onClick={()=>setOpen(true)} className={attention
        ? 'rounded-md bg-gray-900 px-3 py-1.5 font-semibold text-white hover:bg-gray-800'
        : 'rounded-md border border-gray-300 bg-white px-3 py-1.5 text-gray-700 hover:bg-gray-100'}>
        {attention ? 'Resolver' : 'Ver detalle'}
      </button>
    </div>
    <OdooModal open={open} onClose={()=>setOpen(false)} orderId={orderId} buyerName={buyerName} legacySent={legacySent}
      onChanged={()=>{reload();router.refresh();}}/>
  </div>;
}
