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
};

export default function NotificationsPage(){
  const [rows,setRows]=useState<Row[]>([]);
  const [error,setError]=useState("");

  async function load(){
    setError("");
    const {data,error}=await supabase
      .from("notifications")
      .select("id,event_type,title,message,read_at,created_at")
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

  return (
    <WmsPageShell eyebrow="ALERT CENTER" title="Notifications" subtitle="Receiving exceptions and warehouse alerts routed to authorized leadership.">
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
              {!row.read_at ? <button className="miniButton" onClick={()=>markRead(row.id)}><CheckCircle2 size={14}/> Mark read</button> : <span className="status green">Read</span>}
            </div>
          )) : <div className="emptyState">No notifications yet.</div>}
        </div>
      </section>
    </WmsPageShell>
  );
}
