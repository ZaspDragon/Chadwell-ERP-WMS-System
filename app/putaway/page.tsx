"use client";

import { useEffect, useState } from "react";
import { PackageCheck, RefreshCw } from "lucide-react";
import WmsPageShell from "@/components/WmsPageShell";
import { supabase } from "@/lib/supabase/client";

type Row = {
  id:string;
  pallet_id:string;
  suggested_location:string|null;
  actual_location:string|null;
  status:string;
  assigned_to:string|null;
  started_at:string|null;
  completed_at:string|null;
  created_at:string|null;
};

export default function PutawayPage(){
  const [rows,setRows]=useState<Row[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");

  async function load(){
    setLoading(true); setError("");
    const {data,error}=await supabase.from("putaway_tasks")
      .select("id,pallet_id,suggested_location,actual_location,status,assigned_to,started_at,completed_at,created_at")
      .order("created_at",{ascending:false});
    if(error) setError(error.message);
    setRows((data as Row[]|null)??[]);
    setLoading(false);
  }

  useEffect(()=>{load();},[]);

  return (
    <WmsPageShell eyebrow="DIRECTED PUTAWAY" title="Putaway" subtitle="Move received pallets from staging to verified warehouse locations.">
      <div className="summaryGrid">
        <div className="summaryCard"><small>Open Tasks</small><strong>{rows.filter(r=>r.status==="OPEN").length}</strong></div>
        <div className="summaryCard"><small>In Progress</small><strong>{rows.filter(r=>r.status==="IN_PROGRESS").length}</strong></div>
        <div className="summaryCard"><small>Completed</small><strong>{rows.filter(r=>r.status==="COMPLETE").length}</strong></div>
        <div className="summaryCard"><small>Total Tasks</small><strong>{rows.length}</strong></div>
      </div>

      <section className="card">
        <div className="sectionTitle">
          <div><h2>Putaway Queue</h2><p>Scan the pallet, then scan the destination location before completion.</p></div>
          <button className="secondary" onClick={load}><RefreshCw size={16}/> Refresh</button>
        </div>
        {error ? <div className="notice dangerNotice">{error}</div> : null}
        <div className="tableWrap">
          <table>
            <thead><tr><th>Pallet ID</th><th>Suggested</th><th>Actual</th><th>Assigned</th><th>Status</th><th>Created</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={6} className="empty">Loading putaway tasks...</td></tr> :
              rows.length ? rows.map(r=>(
                <tr key={r.id}>
                  <td><strong>{r.pallet_id}</strong></td>
                  <td>{r.suggested_location ?? "Not assigned"}</td>
                  <td>{r.actual_location ?? "—"}</td>
                  <td>{r.assigned_to ?? "Unassigned"}</td>
                  <td><span className="status green">{r.status.replaceAll("_"," ")}</span></td>
                  <td>{r.created_at ? new Date(r.created_at).toLocaleString() : "—"}</td>
                </tr>
              )) : <tr><td colSpan={6} className="empty"><PackageCheck size={26}/> No putaway tasks yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </WmsPageShell>
  );
}
