"use client";

import { useEffect, useMemo, useState } from "react";
import { Box, RefreshCw, Search } from "lucide-react";
import WmsPageShell from "@/components/WmsPageShell";
import { supabase } from "@/lib/supabase/client";

type Row = {
  id:string;
  on_hand:number;
  allocated:number;
  on_hold:number;
  updated_at:string|null;
  items?: { item_number?:string; description?:string } | null;
  warehouse_locations?: { location_code?:string; zone?:string } | null;
  branches?: { code?:string } | null;
};

export default function InventoryPage(){
  const [rows,setRows]=useState<Row[]>([]);
  const [query,setQuery]=useState("");
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");

  async function load(){
    setLoading(true); setError("");
    const {data,error}=await supabase.from("inventory_balances")
      .select("id,on_hand,allocated,on_hold,updated_at,items(item_number,description),warehouse_locations(location_code,zone),branches(code)")
      .order("updated_at",{ascending:false});
    if(error) setError(error.message);
    setRows((data as unknown as Row[]|null)??[]);
    setLoading(false);
  }

  useEffect(()=>{load();},[]);

  const filtered=useMemo(()=>{
    const q=query.trim().toLowerCase();
    if(!q) return rows;
    return rows.filter(r=>[r.items?.item_number,r.items?.description,r.warehouse_locations?.location_code,r.warehouse_locations?.zone,r.branches?.code].filter(Boolean).some(v=>String(v).toLowerCase().includes(q)));
  },[query,rows]);

  const onHand=rows.reduce((s,r)=>s+Number(r.on_hand||0),0);
  const allocated=rows.reduce((s,r)=>s+Number(r.allocated||0),0);
  const hold=rows.reduce((s,r)=>s+Number(r.on_hold||0),0);

  return (
    <WmsPageShell eyebrow="INVENTORY CONTROL" title="Inventory" subtitle="Live WMS quantity by item, branch, and verified warehouse location.">
      <div className="summaryGrid">
        <div className="summaryCard"><small>Inventory Records</small><strong>{rows.length}</strong></div>
        <div className="summaryCard"><small>On Hand</small><strong>{onHand}</strong></div>
        <div className="summaryCard"><small>Allocated</small><strong>{allocated}</strong></div>
        <div className="summaryCard"><small>On Hold</small><strong>{hold}</strong></div>
      </div>

      <section className="card">
        <div className="sectionTitle">
          <div><h2>Inventory Lookup</h2><p>Search item number, description, bin, zone, or branch.</p></div>
          <button className="secondary" onClick={load}><RefreshCw size={16}/> Refresh</button>
        </div>
        <div className="searchInput pageSearch"><Search size={19}/><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search item, location, or branch..." /></div>
        {error ? <div className="notice dangerNotice">{error}</div> : null}
        <div className="tableWrap">
          <table>
            <thead><tr><th>Item</th><th>Description</th><th>Location</th><th>Branch</th><th>On Hand</th><th>Allocated</th><th>Available</th><th>Hold</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={8} className="empty">Loading inventory...</td></tr> :
              filtered.length ? filtered.map(r=>(
                <tr key={r.id}>
                  <td><strong>{r.items?.item_number ?? "—"}</strong></td><td>{r.items?.description ?? "—"}</td><td>{r.warehouse_locations?.location_code ?? "—"}</td><td>{r.branches?.code ?? "—"}</td>
                  <td>{r.on_hand}</td><td>{r.allocated}</td><td>{Number(r.on_hand)-Number(r.allocated)-Number(r.on_hold)}</td><td>{r.on_hold}</td>
                </tr>
              )) : <tr><td colSpan={7} className="empty"><Box size={26}/> No inventory balances yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </WmsPageShell>
  );
}
