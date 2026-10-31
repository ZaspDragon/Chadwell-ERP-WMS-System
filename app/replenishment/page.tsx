"use client";
import { useMemo, useState } from "react";
import WmsPageShell from "@/components/WmsPageShell";
import { planPrimaryReplenishment, type PrimaryDemand } from "@/lib/replenishment/planner";

const sample:PrimaryDemand[]=[
 {branch:"OH01",itemNumber:"20871",primaryBin:"B-03-01",primaryAvailable:2,unprintedOrderDemand:14,minPrimary:8,targetPrimary:24,overstockAvailable:80,alreadyRequested:0},
 {branch:"OH01",itemNumber:"10245",primaryBin:"A-01-02",primaryAvailable:10,unprintedOrderDemand:8,minPrimary:12,targetPrimary:30,overstockAvailable:40,alreadyRequested:0},
 {branch:"OH01",itemNumber:"30916",primaryBin:"D-02-01",primaryAvailable:18,unprintedOrderDemand:5,minPrimary:8,targetPrimary:24,overstockAvailable:60,alreadyRequested:0}
];
export default function ReplenishmentPage(){
 const [rows,setRows]=useState(sample);
 const [queued,setQueued]=useState<string[]>([]);
 const suggestions=useMemo(()=>planPrimaryReplenishment(rows).filter(r=>!queued.includes(r.key)),[rows,queued]);
 return <WmsPageShell eyebrow="CHADWMS / Fulfillment" title="Automatic Primary Restock" subtitle="Order-aware replenishment planning for lift drivers.">
  <div className="panel" style={{padding:18,marginBottom:16}}>
   <strong>Simulation only — no live orders or driver notifications</strong>
   <p className="muted">This preview calculates requests from sample unprinted order demand. Live dispatch requires a verified order feed, bin availability, reservations and database-backed deduplication.</p>
  </div>
  <div className="panel" style={{padding:18,marginBottom:16}}>
   <h2>Unprinted order demand / primary stock</h2>
   <div style={{overflowX:"auto"}}><table style={{width:"100%",textAlign:"left"}}><thead><tr>{["Item / primary","Available","Unprinted demand","Min","Target","Overstock"].map(t=><th key={t} style={{padding:8}}>{t}</th>)}</tr></thead>
   <tbody>{rows.map((r,i)=><tr key={r.itemNumber}><td style={{padding:8}}>{r.itemNumber} / {r.primaryBin}</td>{(["primaryAvailable","unprintedOrderDemand","minPrimary","targetPrimary","overstockAvailable"] as const).map(k=><td key={k} style={{padding:8}}><input aria-label={r.itemNumber+" "+k} type="number" min="0" step="1" value={r[k]} onChange={e=>setRows(v=>v.map((x,j)=>i===j?{...x,[k]:Number(e.target.value)}:x))} style={{width:76,padding:6}}/></td>)}</tr>)}</tbody></table></div>
  </div>
  <div className="panel" style={{padding:18}}>
   <h2>Suggested lift-driver requests ({suggestions.length})</h2>
   {suggestions.map(s=><div key={s.key} style={{borderBottom:"1px solid #64748b",padding:"12px 0"}}>
    <strong>{s.priority} · {s.itemNumber} · {s.primaryBin}</strong>
    <p>Suggested restock: {s.suggestedQty} units · Uncovered orders: {s.uncoveredDemand} units</p>
    <p className="muted">{s.reason}</p>
    <button type="button" onClick={()=>setQueued(v=>[...v,s.key])}>Mark as queued (demo)</button>
   </div>)}
   {!suggestions.length&&<p>No new replenishment suggestions in this simulation.</p>}
   {queued.length>0&&<p role="status">Marked queued in this browser session: {queued.length}. No actual driver task was created.</p>}
   <button type="button" onClick={()=>setQueued([])} style={{marginTop:12}}>Reset demo queue</button>
  </div>
 </WmsPageShell>;
}
