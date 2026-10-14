'use client';
import { useEffect, useState } from 'react';
type Progress = {status:string;error?:string;quotation_ref?:string;quotation_id?:number;candidates?:{id:number;name:string;phone:string;active:boolean}[]};
export function OdooExportStatus({orderId,legacySent=false}:{orderId:string;legacySent?:boolean}) {
  const [progress,setProgress] = useState<Progress|null>(null);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  useEffect(()=>{
    if (legacySent) return;
    let active=true;
    const read = async()=>{try {const r=await fetch(`/api/orders/${orderId}/finalize`);if(!r.ok) throw new Error();const data=await r.json();if(active) setProgress(data.export);if(data.export?.status === "exported") clearInterval(timer);} catch {if(active) setError('No se pudo consultar la exportación.');}};
    void read(); const timer=setInterval(read,10000);
    return ()=>{active=false;clearInterval(timer);};
  },[orderId,legacySent]);
  async function retry(partnerId?:number) {
    setBusy(true);setError('');
    try {const r=await fetch(`/api/orders/${orderId}/finalize`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({partnerId})});const data=await r.json();if(!r.ok) throw new Error(data.message);setProgress(data.export);} catch(e){setError(e instanceof Error ? e.message:'No se pudo reintentar.');}finally{setBusy(false);}
  }
  if(legacySent) return <p className="px-4 pb-3 text-sm">Odoo: registrado previamente.</p>;
  const labels:Record<string,string>={pending:'Pendiente',processing:'Procesando',error:'Error',review:'Requiere revisión',customer_selection:'Seleccionar cliente',exported:'Presupuesto creado'};
  return <div className="px-4 pb-3 text-sm" aria-live="polite">
    <p>Odoo: {labels[progress?.status??'pending']??progress?.status} {progress?.quotation_ref && `· ${progress.quotation_ref}`} {progress?.quotation_id && `(ID ${progress.quotation_id})`}</p>
    {(error||progress?.error)&&<p className="text-red-700">{error||progress?.error}</p>}
    {progress?.candidates?.map(c=><button key={c.id} disabled={busy||!c.active} className="m-1 rounded border px-2 py-1 disabled:opacity-50" onClick={()=>retry(c.id)}>Usar {c.name} · {c.phone} · ID {c.id}{!c.active?' (archivado)':''}</button>)}
    {progress?.status!=='exported'&&<button disabled={busy} className="mt-1 rounded border px-2 py-1 disabled:opacity-50" onClick={()=>retry()}>{busy?'Consultando…':progress?.status==='review'?'Reconciliar con Odoo':'Reintentar exportación'}</button>}
  </div>;
}
