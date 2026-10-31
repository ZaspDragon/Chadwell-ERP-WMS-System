"use client";
import {useMemo,useState} from "react";
import WmsPageShell from "@/components/WmsPageShell";
import {acceptDiscrepancy,orderedChecks,recordCheck,submitInvestigation,type Discrepancy,type ReviewRole,type InventoryLocation} from "@/lib/inventory/discrepancy-workflow";

const locations:InventoryLocation[]=[
 {branch:"OH01",itemNumber:"20871",location:"B-03-01",kind:"PRIMARY"},
 {branch:"OH01",itemNumber:"20871",location:"B-07-03",kind:"OVERSTOCK"},
 {branch:"OH01",itemNumber:"20871",location:"RA-02-01",kind:"OTHER"},
 {branch:"OH01",itemNumber:"20871",location:"D-04-02",kind:"OVERSTOCK"},
 {branch:"OH01",itemNumber:"10245",location:"A-01-02",kind:"PRIMARY"},
 {branch:"OH01",itemNumber:"10245",location:"A-09-04",kind:"OVERSTOCK"},
];
const initial:Discrepancy[]=[
 {id:"DEMO-VAR-01",branch:"OH01",itemNumber:"20871",countedLocation:"B-03-01",expected:24,counted:22,status:"OPEN",acceptedBy:null,acceptedRole:null,checks:orderedChecks("OH01","20871","B-03-01",locations)},
 {id:"DEMO-VAR-02",branch:"OH01",itemNumber:"10245",countedLocation:"A-01-02",expected:10,counted:7,status:"OPEN",acceptedBy:null,acceptedRole:null,checks:orderedChecks("OH01","10245","A-01-02",locations)}
];
export default function DiscrepancyQueue(){
 const [rows,setRows]=useState<Discrepancy[]>(initial);
 const [role,setRole]=useState<ReviewRole>("SUPERVISOR");
 const [name,setName]=useState("");
 const [selected,setSelected]=useState("DEMO-VAR-01");
 const [notes,setNotes]=useState<Record<string,string>>({});
 const [notice,setNotice]=useState("");
 const current=useMemo(()=>rows.find(r=>r.id===selected),[rows,selected]);
 const open=rows.filter(r=>r.status==="OPEN").length;
 function claim(){if(!current||!name.trim()){setNotice("Enter your name to claim this investigation.");return;}setRows(v=>acceptDiscrepancy(v,current.id,name,role));setNotice("Claimed in this demo only. Other leaders would see the owner in a live shared queue.");}
 function check(location:string){if(!current)return;setRows(v=>recordCheck(v,current.id,name,location,notes[location]||""));setNotice("Location marked checked in demo. No inventory changed.");}
 return <WmsPageShell eyebrow="CHADWMS / Inventory Control" title="Discrepancy Investigations" subtitle="Lead, supervisor and manager shared investigation queue.">
  <div className="notice" style={{marginBottom:16}}>Demo only. These are sample variances and locations, not actual stock records. No alerts are sent, claims are not shared across devices, and no inventory adjustment is posted.</div>
  <div className="panel" style={{padding:18,marginBottom:16}}>
   <h2>Leadership notification inbox · {open} unclaimed</h2>
   <p className="muted">Production design: notify all three roles for the correct branch, then atomically assign the first authorized person who accepts. Others see that it has been claimed.</p>
   <div style={{display:"flex",flexWrap:"wrap",gap:12}}>
    <label>Your name<input value={name} onChange={e=>setName(e.target.value)} placeholder="Name" style={{display:"block",padding:10}}/></label>
    <label>Role (demo)<select value={role} onChange={e=>setRole(e.target.value as ReviewRole)} style={{display:"block",padding:10}}>
     <option value="LEAD">Lead</option><option value="SUPERVISOR">Supervisor</option><option value="MANAGER">Manager</option>
    </select></label>
   </div>
  </div>
  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:16}}>
   <div className="panel" style={{padding:18}}>
    <h2>Discrepancies</h2>
    {rows.map(r=><button key={r.id} type="button" onClick={()=>{setSelected(r.id);setNotice("")}} style={{display:"block",width:"100%",textAlign:"left",padding:12,marginTop:10,border:"1px solid #64748b",borderRadius:8,background:selected===r.id?"#dbeafe":"transparent",color:selected===r.id?"#172554":"inherit"}}>
     <strong>{r.itemNumber} · {r.countedLocation}</strong>
     <div>System {r.expected} · Counted {r.counted} · Difference {r.counted-r.expected}</div>
     <small>{r.status} {r.acceptedBy?"· "+r.acceptedBy:"· Notify lead / supervisor / manager"}</small>
    </button>)}
   </div>
   {current&&<div className="panel" style={{padding:18}}>
    <h2>Investigation: {current.itemNumber}</h2>
    <p>Branch {current.branch} · {current.status} · Owner {current.acceptedBy||"Unclaimed"}</p>
    <button type="button" disabled={current.status!=="OPEN"||!name.trim()} onClick={claim} style={{padding:12}}>Accept notification & investigate</button>
    <h3 style={{marginTop:18}}>Locations to verify — in order</h3>
    <p className="muted">Counted bin first, then primary, overstock and other recorded locations. Visit each location and verify the item and quantity.</p>
    {current.checks.map((c,i)=><div key={c.location} style={{padding:"12px 0",borderBottom:"1px solid #64748b"}}>
     <strong>{i+1}. {c.location} · {c.kind}</strong> {c.checked?"✓ Checked":""}
     <label style={{display:"block",marginTop:6}}>Finding / actual quantity<input value={notes[c.location]||""} onChange={e=>setNotes(v=>({...v,[c.location]:e.target.value}))} placeholder="Enter findings" style={{display:"block",padding:10,width:"100%"}}/></label>
     <button type="button" style={{padding:10,marginTop:6}} disabled={current.status!=="ACCEPTED"||current.acceptedBy!==name||c.checked||i>0&&!current.checks[i-1].checked||!(notes[c.location]||"").trim()} onClick={()=>check(c.location)}>Confirm location checked</button>
    </div>)}
    <button type="button" style={{padding:12,marginTop:14}} disabled={current.status!=="ACCEPTED"||current.acceptedBy!==name||!current.checks.every(c=>c.checked)} onClick={()=>{setRows(v=>submitInvestigation(v,current.id,name));setNotice("Investigation submitted for review in demo. No stock adjustment posted.")}}>Submit investigation for review</button>
    {notice&&<p role="status">{notice}</p>}
   </div>}
  </div>
 </WmsPageShell>;
}
