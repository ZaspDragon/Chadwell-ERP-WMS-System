"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, MapPin, PackageCheck, RefreshCw, ScanLine } from "lucide-react";
import WmsPageShell from "@/components/WmsPageShell";
import { supabase } from "@/lib/supabase/client";

type Row = {
  id:string;
  pallet_id:string;
  suggested_location:string|null;
  actual_location:string|null;
  status:string;
  assigned_to:string|null;
  created_at:string|null;
  pallets?: { pallet_code?: string; branch_code?: string } | null;
};

export default function PutawayPage(){
  const [rows,setRows]=useState<Row[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [active,setActive]=useState<Row|null>(null);
  const [location,setLocation]=useState("");

  async function load(){
    setLoading(true); setError("");
    const {data,error}=await supabase.from("putaway_tasks")
      .select("id,pallet_id,suggested_location,actual_location,status,assigned_to,created_at,pallets(pallet_code,branch_code)")
      .order("created_at",{ascending:false});
    if(error) setError(error.message);
    setRows((data as unknown as Row[]|null)??[]);
    setLoading(false);
  }

  useEffect(()=>{load();},[]);

  async function completeTask(){
    if(!active || !location.trim()) return;
    setError(""); setNotice("");
    const {error}=await supabase.rpc("complete_putaway",{
      p_task_id:active.id,
      p_location_code:location.trim().toUpperCase()
    });
    if(error){ setError(error.message); return; }
    setNotice((active.pallets?.pallet_code ?? active.pallet_id)+" put away to "+location.trim().toUpperCase()+". Inventory updated.");
    setActive(null); setLocation("");
    await load();
  }

  return (
    <WmsPageShell eyebrow="DIRECTED PUTAWAY" title="Putaway" subtitle="Scan a received pallet, verify the destination, and post inventory to the warehouse location.">
      {notice ? <div className="notice">{notice}</div> : null}
      {error ? <div className="notice dangerNotice">{error}</div> : null}

      <div className="summaryGrid">
        <div className="summaryCard"><small>Open Tasks</small><strong>{rows.filter(r=>r.status==="OPEN").length}</strong></div>
        <div className="summaryCard"><small>In Progress</small><strong>{rows.filter(r=>r.status==="IN_PROGRESS").length}</strong></div>
        <div className="summaryCard"><small>Completed</small><strong>{rows.filter(r=>r.status==="COMPLETE").length}</strong></div>
        <div className="summaryCard"><small>Total Tasks</small><strong>{rows.length}</strong></div>
      </div>

      {active ? (
        <section className="card">
          <div className="sectionTitle">
            <div><h2>Complete Putaway</h2><p>Scan the actual warehouse bin/location before posting inventory.</p></div>
            <PackageCheck size={28}/>
          </div>
          <div className="metadataGrid">
            <div><small>PALLET</small><strong>{active.pallets?.pallet_code ?? active.pallet_id}</strong></div>
            <div><small>BRANCH</small><strong>{active.pallets?.branch_code ?? "—"}</strong></div>
            <div><small>SUGGESTED</small><strong>{active.suggested_location ?? "Not assigned"}</strong></div>
            <div><small>STATUS</small><strong>{active.status}</strong></div>
            <div><small>ASSIGNED</small><strong>{active.assigned_to ?? "Unassigned"}</strong></div>
          </div>
          <div className="searchRow">
            <div className="searchInput">
              <ScanLine size={20}/>
              <input value={location} onChange={(e)=>setLocation(e.target.value)} onKeyDown={(e)=>e.key==="Enter"&&completeTask()} placeholder="Scan destination location barcode..." autoFocus/>
            </div>
            <button className="success" onClick={completeTask}><CheckCircle2 size={17}/> Complete Putaway</button>
          </div>
        </section>
      ) : null}

      <section className="card">
        <div className="sectionTitle">
          <div><h2>Putaway Queue</h2><p>Select an open task, scan the destination, and the WMS will update inventory and movement history.</p></div>
          <button className="secondary" onClick={load}><RefreshCw size={16}/> Refresh</button>
        </div>
        <div className="tableWrap">
          <table>
            <thead><tr><th>Pallet</th><th>Branch</th><th>Suggested</th><th>Actual</th><th>Status</th><th>Created</th><th>Action</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={7} className="empty">Loading putaway tasks...</td></tr> :
              rows.length ? rows.map(r=>(
                <tr key={r.id}>
                  <td><strong>{r.pallets?.pallet_code ?? r.pallet_id}</strong></td>
                  <td>{r.pallets?.branch_code ?? "—"}</td>
                  <td>{r.suggested_location ?? "Not assigned"}</td>
                  <td>{r.actual_location ?? "—"}</td>
                  <td><span className="status green">{r.status.replaceAll("_"," ")}</span></td>
                  <td>{r.created_at ? new Date(r.created_at).toLocaleString() : "—"}</td>
                  <td>{r.status!=="COMPLETE" ? <button className="miniButton" onClick={()=>{setActive(r);setLocation(r.suggested_location??"");}}><MapPin size={14}/> Put Away</button> : "Done"}</td>
                </tr>
              )) : <tr><td colSpan={7} className="empty"><PackageCheck size={26}/> No putaway tasks yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </WmsPageShell>
  );
}
