"use client";
import {useEffect,useMemo,useState} from "react";
import WmsPageShell from "@/components/WmsPageShell";
import {supabase} from "@/lib/supabase/client";
type Movement={id:string;movement_type:string;item_number:string;branch_code:string;quantity:number;from_location:string|null;to_location:string|null;created_by:string|null;created_at:string|null};
export default function MovementAudit(){
 const [rows,setRows]=useState<Movement[]>([]),[branch,setBranch]=useState("OH01"),[day,setDay]=useState(()=>new Date().toLocaleDateString("en-CA")),[kind,setKind]=useState("ALL"),[search,setSearch]=useState(""),[error,setError]=useState(""),[busy,setBusy]=useState(false),[limitNotice,setLimitNotice]=useState("");
 useEffect(()=>{let cancelled=false;async function load(){setBusy(true);setError("");setLimitNotice("");const start=new Date(day+"T00:00:00");const end=new Date(start);end.setDate(end.getDate()+1);const {data,error}=await supabase.from("inventory_movements").select("id,movement_type,item_number,branch_code,quantity,from_location,to_location,created_by,created_at").eq("branch_code",branch.trim().toUpperCase()).gte("created_at",start.toISOString()).lt("created_at",end.toISOString()).order("created_at",{ascending:false}).limit(1000);if(cancelled)return;if(error)setError(error.message);setRows((data as Movement[]|null)||[]);if((data?.length||0)===1000)setLimitNotice("Showing the newest 1,000 transactions. Narrow your date or export from a paginated report for a complete audit.");setBusy(false)}if(day&&branch.trim())void load();return()=>{cancelled=true}},[day,branch]);
 const filtered=useMemo(()=>rows.filter(r=>(kind==="ALL"||r.movement_type===kind)&&[r.item_number,r.from_location,r.to_location,r.created_by].some(v=>String(v||"").toLowerCase().includes(search.toLowerCase()))),[rows,kind,search]);
 const types=[...new Set(rows.map(r=>r.movement_type))].sort();
 return <WmsPageShell eyebrow="CHADWMS / INVENTORY CONTROL" title="Movement Audit" subtitle="Read-only trace of recorded inventory movements.">
 <section className="card" style={{padding:20}}>
 <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:16}}>
 <label>Branch<input value={branch} onChange={e=>setBranch(e.target.value)} style={{display:"block",padding:10}}/></label>
 <label>Transaction date (local)<input type="date" value={day} onChange={e=>setDay(e.target.value)} style={{display:"block",padding:10}}/></label>
 <label>Movement type<select value={kind} onChange={e=>setKind(e.target.value)} style={{display:"block",padding:10}}><option value="ALL">All types</option>{types.map(t=><option key={t}>{t}</option>)}</select></label>
 <label>Item / bin / employee<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..." style={{display:"block",padding:10}}/></label>
 </div>
 <p>{busy?"Loading movements…":`${filtered.length} matching movements`}</p>
 {error&&<p role="alert" style={{color:"crimson"}}>{error}</p>}{limitNotice&&<p role="status">{limitNotice}</p>}
 <div className="tableWrap"><table><thead><tr><th>Timestamp</th><th>Type</th><th>Item</th><th>Qty</th><th>From</th><th>To</th><th>Employee ID</th></tr></thead><tbody>{filtered.map(r=><tr key={r.id}><td>{r.created_at?new Date(r.created_at).toLocaleString():"—"}</td><td>{r.movement_type}</td><td>{r.item_number}</td><td>{r.quantity}</td><td>{r.from_location||"—"}</td><td>{r.to_location||"—"}</td><td>{r.created_by||"—"}</td></tr>)}{!busy&&filtered.length===0&&<tr><td colSpan={7}>No matching movements for this date and branch.</td></tr>}</tbody></table></div>
 </section><p className="muted">Audit display only. Database access is subject to Supabase row-level security; this page does not grant new permissions or modify inventory.</p>
 </WmsPageShell>
}