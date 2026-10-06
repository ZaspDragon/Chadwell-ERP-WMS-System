"use client";

import { useEffect, useMemo, useState } from "react";
import { CirclePause, CirclePlay, Printer, QrCode, RefreshCw, Search } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import WmsPageShell from "@/components/WmsPageShell";
import { supabase } from "@/lib/supabase/client";

type Row = {
  id: string;
  pallet_code: string;
  branch_code: string;
  status: string;
  created_by: string | null;
  created_at: string | null;
  closed_at: string | null;
  receiving_documents?: { document_number?: string } | null;
  pallet_lines?: { id:string; item_number:string; description:string|null; uom:string|null; quantity:number }[];
};

export default function PalletsPage() {
  const [rows,setRows]=useState<Row[]>([]);
  const [query,setQuery]=useState("");
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [selected,setSelected]=useState<Row|null>(null);
  const [notice,setNotice]=useState("");
  const [holdReason,setHoldReason]=useState("");

  async function load(){
    setLoading(true); setError("");
    const {data,error}=await supabase.from("pallets")
      .select("id,pallet_code,branch_code,status,created_by,created_at,closed_at,receiving_documents(document_number),pallet_lines(id,item_number,description,uom,quantity)")
      .order("created_at",{ascending:false});
    if(error) setError(error.message);
    setRows((data as Row[]|null)??[]);
    setLoading(false);
  }

  useEffect(()=>{load();},[]);

  async function toggleHold(row:Row){
    setError("");setNotice("");
    const puttingOnHold=row.status!=="HOLD";
    const {error}=await supabase.rpc("set_pallet_hold",{
      p_pallet_id:row.id,
      p_hold:puttingOnHold,
      p_reason:puttingOnHold ? holdReason.trim()||"Warehouse hold" : "Released from hold"
    });
    if(error){setError(error.message);return;}
    setNotice(row.pallet_code+(puttingOnHold?" placed on hold.":" released from hold."));
    setHoldReason("");
    await load();
    setSelected(null);
  }

  const filtered=useMemo(()=>{
    const q=query.trim().toLowerCase();
    if(!q) return rows;
    return rows.filter(r=>[r.pallet_code,r.branch_code,r.status,r.created_by,r.receiving_documents?.document_number,...(r.pallet_lines??[]).map(l=>l.item_number)].filter(Boolean).some(v=>String(v).toLowerCase().includes(q)));
  },[query,rows]);

  return (
    <WmsPageShell eyebrow="PALLET CONTROL" title="Pallets / LPNs" subtitle="Scan, research, hold/release, reprint, and track every receiving pallet or license plate.">
      {notice ? <div className="notice">{notice}</div> : null}
      <div className="summaryGrid">
        <div className="summaryCard"><small>Total Pallets</small><strong>{rows.length}</strong></div>
        <div className="summaryCard"><small>Open</small><strong>{rows.filter(r=>r.status==="OPEN").length}</strong></div>
        <div className="summaryCard"><small>Ready for Putaway</small><strong>{rows.filter(r=>r.status==="READY_FOR_PUTAWAY").length}</strong></div>
        <div className="summaryCard"><small>On Hold</small><strong>{rows.filter(r=>r.status==="HOLD").length}</strong></div>
      </div>

      <section className="card">
        <div className="sectionTitle">
          <div><h2>Pallet Lookup</h2><p>Scan a pallet QR or search the pallet code.</p></div>
          <button className="secondary" onClick={load}><RefreshCw size={16}/> Refresh</button>
        </div>
        <div className="searchInput pageSearch"><Search size={19}/><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Scan or search pallet / LPN..." autoFocus /></div>
        {error ? <div className="notice dangerNotice">{error}</div> : null}
        <div className="tableWrap">
          <table>
            <thead><tr><th>Pallet / LPN</th><th>Document</th><th>Branch</th><th>Status</th><th>Units</th><th>Created By</th><th>Action</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={7} className="empty">Loading pallets...</td></tr> :
              filtered.length ? filtered.map(r=>(
                <tr key={r.id}>
                  <td><strong>{r.pallet_code}</strong></td>
                  <td>{r.receiving_documents?.document_number ?? "—"}</td>
                  <td>{r.branch_code}</td>
                  <td><span className="status green">{r.status.replaceAll("_"," ")}</span></td>
                  <td>{(r.pallet_lines??[]).reduce((sum,l)=>sum+Number(l.quantity||0),0)}</td>
                  <td>{r.created_by ?? "—"}</td>
                  <td><button className="miniButton" onClick={()=>setSelected(r)}><QrCode size={14}/> Details</button></td>
                </tr>
              )) : <tr><td colSpan={7} className="empty"><QrCode size={26}/> No pallets yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {selected ? (
        <div className="modalBackdrop">
          <div className="modal transferTicketModal">
            <div className="modalHeader">
              <div><p className="eyebrow">PALLET / LPN</p><h2>{selected.pallet_code}</h2><p className="muted">{selected.receiving_documents?.document_number ?? "No source document"} · {selected.branch_code}</p></div>
              <button className="iconButton" onClick={()=>setSelected(null)}>×</button>
            </div>
            <div className="transferTicketTop">
              <div><small>STATUS</small><strong>{selected.status.replaceAll("_"," ")}</strong></div>
              <div><small>CREATED BY</small><strong>{selected.created_by ?? "—"}</strong></div>
              <div className="ticketQrBlock"><QRCodeSVG value={"WMS|PALLET|"+selected.pallet_code} size={110} level="M"/><small>Scan pallet anywhere in WMS</small></div>
            </div>
            <div className="tableWrap">
              <table>
                <thead><tr><th>Item</th><th>Description</th><th>Qty</th><th>UOM</th></tr></thead>
                <tbody>
                  {(selected.pallet_lines??[]).length ? (selected.pallet_lines??[]).map(line=>(
                    <tr key={line.id}><td><strong>{line.item_number}</strong></td><td>{line.description??"—"}</td><td>{line.quantity}</td><td>{line.uom??"EA"}</td></tr>
                  )) : <tr><td colSpan={4} className="empty">No contents on this pallet.</td></tr>}
                </tbody>
              </table>
            </div>
            {selected.status!=="PUTAWAY_COMPLETE" ? (
              <div className="scanItem">
                {selected.status!=="HOLD" ? (
                  <>
                    <label>Hold Reason</label>
                    <input value={holdReason} onChange={(e)=>setHoldReason(e.target.value)} placeholder="Damage, research, mismatch, etc."/>
                  </>
                ) : null}
              </div>
            ) : null}
            <div className="modalActions">
              <button className="secondary" onClick={()=>window.print()}><Printer size={16}/> Reprint Pallet QR</button>
              {selected.status!=="PUTAWAY_COMPLETE" ? (
                <button className={selected.status==="HOLD" ? "success" : "dangerOutline"} onClick={()=>toggleHold(selected)}>
                  {selected.status==="HOLD" ? <><CirclePlay size={16}/> Release Hold</> : <><CirclePause size={16}/> Place Hold</>}
                </button>
              ) : null}
              <button className="primary" onClick={()=>setSelected(null)}>Done</button>
            </div>
          </div>
        </div>
      ) : null}
    </WmsPageShell>
  );
}
