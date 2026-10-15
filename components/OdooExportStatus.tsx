'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CUSTOMER_REVIEW_MESSAGE, type BuyerData } from '@/lib/customerReview';
import type { ExportProgress as Progress } from '@/lib/odooExport';
import { exportAction, parseExportResponse, displayExportError, EXPORT_MIGRATION_MESSAGE } from '@/lib/odooExportStatus';
export function OdooExportStatus({orderId,legacySent=false,onRetryAllowed}:{orderId:string;legacySent?:boolean;onRetryAllowed?:(orderId:string,allowed:boolean)=>void}) {
  const router = useRouter();
  const [progress,setProgress] = useState<Progress|null>(null);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [readError,setReadError] = useState('');
  const [reading,setReading] = useState(false);
  const [refresh,setRefresh] = useState(0);
  const [open,setOpen] = useState(false);
  const [editing,setEditing] = useState(false);
  const [form,setForm] = useState<BuyerData>({name:'',dni:'',phone:''});
  const [formRevision,setFormRevision] = useState(0);
  useEffect(()=>{setProgress(null);setError('');setReadError('');setOpen(false);setEditing(false);},[orderId]);
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
  async function send(body: Record<string,unknown> = {}) {
    if (readError || reading || progress?.migration_required) return;
    setBusy(true);setError('');
    try {
      const r=await fetch(`/api/orders/${orderId}/finalize`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      const next=await parseExportResponse(r);
      setProgress(next);
      if(body.action === 'correct' && next?.customer_revision !== formRevision) {setEditing(false);router.refresh();}
      if(body.action === 'defer') {setOpen(false);setEditing(false);}
    } catch(e){setError(e instanceof Error ? e.message:'No se pudo reintentar.');setReadError('Actualizá el estado antes de volver a actuar.');}finally{setBusy(false);}
  }
  function correct() {
    setForm(progress?.customer_buyer ?? {name:'',dni:'',phone:''});
    setFormRevision(progress?.customer_revision ?? 0);setEditing(true);setOpen(true);
  }

  const labels:Record<string,string>={pending:'Pendiente',processing:'Procesando',error:'Error',review:'Requiere conciliación',customer_review:'Revisar datos del cliente',customer_selection:'Seleccionar cliente',exported:'Enviado a Odoo',legacy_sent:'Registrado previamente'};
  const action = exportAction(progress,!!readError);
  const blocked = busy || reading || !!readError || !!progress?.migration_required;
  useEffect(()=>{onRetryAllowed?.(orderId,action === 'retry' && !blocked);},[orderId,action,blocked,onRetryAllowed]);
  const review = progress?.customer_review;
  const canCorrect = !!progress?.customer_buyer && !progress.quotation_id && !progress.phase?.endsWith('creating') && progress.status !== 'exported' && progress.status !== 'processing';
  const button = 'm-1 rounded border px-3 py-2 disabled:opacity-50';
  const different = 'bg-amber-100 font-semibold';
  return <div className="px-4 pb-3 text-sm" aria-live="polite">
    <p>Odoo: {progress ? labels[progress.status] ?? progress.status : legacySent ? 'Registrado previamente (gestión manual)' : reading ? 'Consultando estado…' : readError ? 'Estado no disponible' : 'Sin exportación automática (gestión manual)'} {progress?.quotation_ref && `· ${progress.quotation_ref}`} {progress?.quotation_id && `(ID ${progress.quotation_id})`}</p>
    {readError && <p className="text-red-700">{readError} Se conserva el último estado conocido.</p>}
    {progress?.migration_required && <p className="text-amber-900">{EXPORT_MIGRATION_MESSAGE}</p>}
    <button disabled={busy || reading} className={button} onClick={()=>setRefresh(value=>value+1)}>{reading ? 'Consultando…' : 'Actualizar estado'}</button>
    {progress?.status === 'customer_review' && <p className="font-semibold text-amber-900">{CUSTOMER_REVIEW_MESSAGE}</p>}
    {(error||(progress?.error && progress.error !== CUSTOMER_REVIEW_MESSAGE))&&<p className="text-red-700">{displayExportError(error||progress?.error)}</p>}
    {progress?.quotation_id && progress.status !== 'exported' && <p>El presupuesto existente necesita revisión separada en Odoo; no se reasignará desde este pedido.</p>}
    {progress?.status === 'customer_review' && <button className={button} onClick={()=>{setOpen(!open);setEditing(false);}} aria-expanded={open}>{open?'Cerrar revisión':'Revisar datos del cliente'}</button>}
    {open && !editing && review && !progress?.quotation_id && <section aria-label="Revisión del cliente" className="my-3 overflow-x-auto rounded border p-3">
      <p className="mb-2">Cliente Odoo ID {review.remote.id}{!review.remote.active && ' · Archivado'}. Las diferencias están resaltadas.</p>
      <table className="w-full border-collapse text-left">
        <thead><tr><th className="p-2">Dato</th><th className="p-2">Datos del pedido</th><th className="p-2">Cliente existente en Odoo</th></tr></thead>
        <tbody>
          <tr className={review.differences.name?different:''}><th className="p-2">Nombre</th><td className="p-2">{review.local.name||'Sin nombre'}</td><td className="p-2">{review.remote.name||'Sin nombre'}</td></tr>
          <tr className={review.differences.document?different:''}><th className="p-2">Documento</th><td className="p-2">{review.localDocumentType} · {review.local.dni||'Sin número'}</td><td className="p-2">{review.remote.documentType||'Sin tipo'} · {review.remote.dni||'Sin número'}</td></tr>
          <tr className={review.differences.phone?different:''}><th className="p-2">Teléfono</th><td className="p-2">{review.local.phone||'Sin teléfono'}</td><td className="p-2">{review.remote.phone||'Sin teléfono'}</td></tr>
        </tbody>
      </table>
      <p className="mt-2">Usar el cliente existente conserva el contacto de Odoo sin modificarlo y registra tu aprobación.</p>
      <button className={button} disabled={blocked||!review.canApprove||!!progress?.phase?.endsWith('creating')} onClick={()=>send({action:'approve',revision:review.revision,partnerId:review.remote.id,token:review.token})}>Usar cliente existente</button>
      <button className={button} disabled={blocked||!canCorrect} onClick={correct}>Corregir datos del pedido</button>
      <button className={button} disabled={blocked} onClick={()=>send({action:'defer',revision:review.revision})}>Resolver más tarde</button>
    </section>}
    {canCorrect && !open && progress?.status !== 'customer_review' && <button className={button} disabled={blocked} onClick={correct}>Corregir datos del pedido</button>}
    {editing && canCorrect && <form className="my-3 space-y-2 rounded border p-3" onSubmit={e=>{e.preventDefault();void send({action:'correct',revision:formRevision,buyer:form,preserveResolvedContact:true});}}>
      <p className="font-semibold">Corregir datos del pedido · DNI</p>
      <p>Se conservan los datos originales, el pago y los importes. El contacto existente en Odoo se conserva sin modificarlo. Se repetirá la búsqueda del cliente; si no existe, se podrá crear uno nuevo.</p>
      {(['name','dni','phone'] as const).map(key=><label className="block" key={key}>{key==='name'?'Nombre y apellido':key==='dni'?'DNI':'Teléfono'}<input required inputMode={key==='dni'?'numeric':key==='phone'?'tel':'text'} maxLength={key==='name'?200:80} className="ml-2 rounded border p-2" value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})}/></label>)}
      {!!progress?.created_customers?.length && <p>Contactos creados previamente y conservados: {progress.created_customers.map(c=>`ID ${c.id}`).join(', ')}.</p>}
      <div className="flex flex-wrap items-center gap-3 border-t border-gray-200 pt-4 mt-4">
        <button className="rounded-md bg-gray-900 px-4 py-2.5 font-semibold text-white transition-colors hover:bg-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 disabled:cursor-not-allowed disabled:opacity-50" disabled={blocked} type="submit">Guardar corrección y volver a buscar</button>
        <button className="rounded-md px-4 py-2.5 font-medium text-gray-600 transition-colors hover:bg-gray-200 hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500 disabled:cursor-not-allowed disabled:opacity-50" type="button" disabled={blocked} onClick={()=>{setEditing(false);setOpen(!!review);}}>Cancelar</button>
      </div>
    </form>}
    {open && progress?.original_buyer && <details className="my-2"><summary>Datos originales del checkout</summary><p>{progress.original_buyer.name} · DNI {progress.original_buyer.dni} · {progress.original_buyer.phone}</p></details>}
    {progress?.status === 'customer_selection' && progress?.candidates?.map(c=><button key={c.id} disabled={blocked||!c.active} className={button} onClick={()=>send({partnerId:c.id})}>Seleccionar {c.name} · {c.phone||'Sin teléfono'} · ID {c.id}{!c.active?' (archivado)':''}</button>)}
    {action && <button disabled={blocked} className={button} onClick={()=>send()}>{busy?'Consultando…':action==='reconcile'?'Reconciliar con Odoo':'Reintentar exportación'}</button>}
  </div>;
}
