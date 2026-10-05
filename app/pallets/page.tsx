"use client";

import { useEffect, useMemo, useState } from "react";
import { QrCode, RefreshCw, Search } from "lucide-react";
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
};

export default function PalletsPage() {
  const [rows,setRows]=useState<Row[]>([]);
  const [query,setQuery]=useState("");
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");

  async function load(){
    setLoading(true); setError("");
    const {data,error}=await supabase.from("pallets")
      .select("id,pallet_code,branch_code,status,created_by,created_at,closed_at")
      .order("created_at",{ascending:false});
    if(error) setError(error.message);
    setRows((data as Row[]|null)??[]);
    setLoading(false);
  }

  useEffect(()=>{load();},[]);

  const filtered=useMemo(()=>{
    const q=query.trim().toLowerCase();
    if(!q) return rows;
    return rows.filter(r=>[r.pallet_code,r.branch_code,r.status,r.created_by].filter(Boolean).some(v=>String(v).toLowerCase().includes(q)));
  },[query,rows]);

  return (
    <WmsPageShell eyebrow="PALLET CONTROL" title="Pallets / LPNs" subtitle="Scan, research, and track every receiving pallet or license plate.">
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
            <thead><tr><th>Pallet / LPN</th><th>Branch</th><th>Status</th><th>Created By</th><th>Created</th><th>Closed</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={6} className="empty">Loading pallets...</td></tr> :
              filtered.length ? filtered.map(r=>(
                <tr key={r.id}>
                  <td><strong>{r.pallet_code}</strong></td><td>{r.branch_code}</td>
                  <td><span className="status green">{r.status.replaceAll("_"," ")}</span></td>
                  <td>{r.created_by ?? "—"}</td><td>{r.created_at ? new Date(r.created_at).toLocaleString() : "—"}</td>
                  <td>{r.closed_at ? new Date(r.closed_at).toLocaleString() : "—"}</td>
                </tr>
              )) : <tr><td colSpan={6} className="empty"><QrCode size={26}/> No pallets yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </WmsPageShell>
  );
}
