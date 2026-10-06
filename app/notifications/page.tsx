"use client";

import { useEffect, useState } from "react";
import { Bell, CheckCircle2, RefreshCw } from "lucide-react";
import WmsPageShell from "@/components/WmsPageShell";
import { supabase } from "@/lib/supabase/client";

type Row = {
  id:string;
  event_type:string;
  title:string;
  message:string;
  read_at:string|null;
  created_at:string;
  entity_type:string|null;
  entity_id:string|null;
};

export default function NotificationsPage(){
  const [rows,setRows]=useState<Row[]>([]);
  const [error,setError]=useState("");
  const [resolveRow,setResolveRow]=useState<Row|null>(null);
  const [resolution,setResolution]=useState("");
  const [notice,setNotice]=useState("");

  async function load(){
    setError("");
    const {data,error}=await supabase
      .from("notifications")
      .select("id,event_type,title,message,read_at,created_at,entity_type,entity_id")
      .order("created_at",{ascending:false})
      .limit(100);
    if(error) setError(error.message);
    setRows((data as Row[]|null)??[]);
  }

  useEffect(()=>{load();},[]);

  async function markRead(id:string){
    const {error}=await supabase.from("notifications").update({read_at:new Date().toISOString()}).eq("id",id);
    if(error){setError(error.message);return;}
    await load();
  }

  async function resolveException(){
    if(!resolveRow?.entity_id) return;
    setError("");setNotice("");
    const {error}=await supabase.rpc("resolve_receiving_exception",{
      p_exception_id:resolveRow.entity_id,
      p_resolution:resolution.trim()
    });
    if(error){setError(error.message);return;}
    await supabase.from("notifications").update({read_at:new Date().toISOString()}).eq("id",resolveRow.id);
    setNotice("Receiving exception resolved and audited.");
    setResolveRow(null);setResolution("");
    await load();
  }

  return (
    <WmsPageShell eyebrow="ALERT CENTER" title="Notifications" subtitle="Receiving exceptions and warehouse alerts routed to authorized leadership.">
      {notice ? <div className="notice">{notice}</div> : null}
      {error ? <div className="notice dangerNotice">{error}</div> : null}
      <section className="card">
        <div className="sectionTitle">
          <div><h2>Alerts</h2><p>Unread alerts stay visible until acknowledged.</p></div>
          <button className="secondary" onClick={load}><RefreshCw size={16}/> Refresh</button>
        </div>
        <div className="notificationList">
          {rows.length ? rows.map(row=>(
            <div className={"notificationRow"+(!row.read_at?" unread":"")} key={row.id}>
              <Bell size={19}/>
              <div>
                <strong>{row.title}</strong>
                <p>{row.message}</p>
                <small>{new Date(row.created_at).toLocaleString()}</small>
              </div>
              <div className="inlineActions">
                {row.entity_type==="receiving_exception" && row.entity_id ? (
                  <button className="miniButton" onClick={()=>{setResolveRow(row);setResolution("");}}>Resolve</button>
                ) : null}
                {!row.read_at ? <button className="miniButton" onClick={()=>markRead(row.id)}><CheckCircle2 size={14}/> Mark read</button> : <span className="status green">Read</span>}
              </div>
            </div>
          )) : <div className="emptyState">No notifications yet.</div>}
        </div>
      </section>

      {resolveRow ? (
        <div className="modalBackdrop">
          <div className="modal">
            <div className="modalHeader">
              <div><p className="eyebrow">RESOLVE EXCEPTION</p><h2>{resolveRow.title}</h2><p className="muted">{resolveRow.message}</p></div>
              <button className="iconButton" onClick={()=>setResolveRow(null)}>×</button>
            </div>
            <label>Resolution Notes</label>
            <textarea rows={4} value={resolution} onChange={(e)=>setResolution(e.target.value)} placeholder="What was verified, corrected, approved, or returned?"/>
            <div className="modalActions">
              <button className="secondary" onClick={()=>setResolveRow(null)}>Cancel</button>
              <button className="primary" onClick={resolveException}>Resolve Exception</button>
            </div>
          </div>
        </div>
      ) : null}
    </WmsPageShell>
  );
}
