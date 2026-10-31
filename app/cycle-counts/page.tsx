"use client";

import { useMemo, useState } from "react";
import WmsPageShell from "@/components/WmsPageShell";

type CountLine = { id:number; branch:string; location:string; item:string; quantity:number; countedAt:string; status:"Draft"|"Recount Needed" };
const csvCell=(value:string|number)=>'"'+String(value).replace(/"/g,'""')+'"';
export default function CycleCountsPage(){
  const [branch,setBranch]=useState("OH01");
  const [location,setLocation]=useState("");
  const [item,setItem]=useState("");
  const [quantity,setQuantity]=useState("");
  const [lines,setLines]=useState<CountLine[]>([]);
  const [notice,setNotice]=useState("");
  const [filter,setFilter]=useState("");
  const visible=useMemo(()=>lines.filter(l=>[l.location,l.item,l.branch].some(v=>v.toLowerCase().includes(filter.toLowerCase()))),[lines,filter]);
  function addLine(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();
    const b=branch.trim().toUpperCase(),loc=location.trim().toUpperCase(),sku=item.trim().toUpperCase();
    const n=Number(quantity);
    if(!b||!loc||!sku||!quantity.trim()||!Number.isSafeInteger(n)||n<0){setNotice("Enter a branch, location, item number and a whole-number quantity of zero or greater.");return;}
    if(lines.some(l=>l.branch===b&&l.location===loc&&l.item===sku&&l.status==="Draft")){setNotice("This item/location is already in the draft. Mark it for recount before entering a replacement.");return;}
    setLines(prev=>[{id:Date.now()+Math.random(),branch:b,location:loc,item:sku,quantity:n,countedAt:new Date().toISOString(),status:"Draft"},...prev]);
    setItem("");setQuantity("");setNotice("Count added to this browser session only. No stock was adjusted.");
  }
  function exportCsv(){
    if(!lines.length)return;
    const header=["branch","location","item_number","counted_quantity","counted_at_utc","status"];
    const rows=lines.map(l=>[l.branch,l.location,l.item,l.quantity,l.countedAt,l.status].map(csvCell).join(","));
    const blob=new Blob([[header.map(csvCell).join(","),...rows].join("\r\n")],{type:"text/csv;charset=utf-8"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;a.download="chadwms-cycle-count-draft.csv";a.click();
    URL.revokeObjectURL(url);
  }
  return <WmsPageShell eyebrow="CHADWMS / Inventory Control" title="Cycle Count Worksheet" subtitle="Capture physical counts without automatically adjusting inventory.">
    <div className="notice" style={{marginBottom:16}}>Offline-style session worksheet — not connected to Supabase. Entries are lost when this page reloads. Export your draft before leaving. No inventory balances change.</div>
    <div className="panel" style={{padding:20,marginBottom:16}}>
      <h2>Enter physical count</h2>
      <form onSubmit={addLine} style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12}}>
        <label>Branch<input required value={branch} onChange={e=>setBranch(e.target.value)} placeholder="OH01" style={{display:"block",width:"100%",padding:10}}/></label>
        <label>Bin / location<input required value={location} onChange={e=>setLocation(e.target.value)} placeholder="A-01-01" style={{display:"block",width:"100%",padding:10}}/></label>
        <label>Item number<input required value={item} onChange={e=>setItem(e.target.value)} placeholder="Item number" style={{display:"block",width:"100%",padding:10}}/></label>
        <label>Physical quantity<input required type="number" min="0" step="1" value={quantity} onChange={e=>setQuantity(e.target.value)} style={{display:"block",width:"100%",padding:10}}/></label>
        <button type="submit" style={{padding:12}}>Add count</button>
      </form>
      {notice&&<p role="status" style={{marginTop:12}}>{notice}</p>}
    </div>
    <div className="panel" style={{padding:20}}>
      <div style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap",alignItems:"center"}}>
        <div><h2>Session counts: {lines.length}</h2><p>Recounts: {lines.filter(l=>l.status==="Recount Needed").length} · Daily production target: 200 counts per counter (tracking not connected)</p></div>
        <button type="button" disabled={!lines.length} onClick={exportCsv}>Export CSV draft</button>
      </div>
      <label>Find count<input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Filter by branch, bin or item" style={{display:"block",padding:10,margin:"8px 0 16px",maxWidth:360,width:"100%"}}/></label>
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",textAlign:"left"}}>
          <thead><tr>{["Branch","Location","Item","Physical qty","Status","Action"].map(h=><th key={h} style={{padding:10,borderBottom:"1px solid #64748b"}}>{h}</th>)}</tr></thead>
          <tbody>{visible.map(l=><tr key={l.id}>
            <td style={{padding:10}}>{l.branch}</td><td style={{padding:10}}>{l.location}</td><td style={{padding:10}}>{l.item}</td><td style={{padding:10}}>{l.quantity}</td><td style={{padding:10}}>{l.status}</td>
            <td style={{padding:10}}><button type="button" onClick={()=>setLines(prev=>prev.map(x=>x.id===l.id?{...x,status:"Recount Needed"}:x))} disabled={l.status==="Recount Needed"}>Flag recount</button></td>
          </tr>)}</tbody>
        </table>
        {!visible.length&&<p>No counts to display.</p>}
      </div>
    </div>
  </WmsPageShell>;
}
