"use client";
import {useState} from "react";
import WmsPageShell from "@/components/WmsPageShell";
import {DRIVERS,assignDriver,beginTask,finishTask,exceptionTask,type DriverTask} from "@/lib/replenishment/driver-tasks";

const demo:DriverTask[]=[{id:"DEMO-1",key:"OH01:20871:B-03-01",branch:"OH01",itemNumber:"20871",primaryBin:"B-03-01",sourceBin:"RB-01-02",requestedQty:22,priority:"BLOCKING",status:"OPEN",driver:null,actualQty:null,note:"",createdAt:"Preview"}];
export default function DriverRestocks(){
 const [tasks,setTasks]=useState<DriverTask[]>(demo);
 const [driver,setDriver]=useState<string>(DRIVERS[0]);
 const [source,setSource]=useState("");const [destination,setDestination]=useState("");
 const [item,setItem]=useState("");const [qty,setQty]=useState("");
 const [note,setNote]=useState("");const [message,setMessage]=useState("");
 const [selected,setSelected]=useState("DEMO-1");
 const task=tasks.find(t=>t.id===selected);
 function complete(){
  if(!task)return;
  const result=finishTask(tasks,task.id,source,destination,item,Number(qty));
  setTasks(result.tasks);
  setMessage(result.error||"Demo task completed. Inventory was NOT moved or adjusted.");
 }
 return <WmsPageShell eyebrow="CHADWMS / Lift Drivers" title="Restock Driver Queue" subtitle="Assign, scan and verify primary replenishment tasks.">
  <div className="panel" style={{padding:18,marginBottom:16}}>
   <strong>Simulation — not connected to driver accounts or live inventory</strong>
   <p className="muted">All tasks are examples and reset when the page reloads. No dispatch notifications, bin transfers or productivity credits are posted.</p>
  </div>
  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:16}}>
   <div className="panel" style={{padding:18}}>
    <h2>Restock requests</h2>
    {tasks.map(t=><button key={t.id} type="button" onClick={()=>{setSelected(t.id);setMessage("");setSource("");setDestination("");setItem("");setQty("")}} style={{display:"block",width:"100%",textAlign:"left",padding:12,marginTop:10,border:"1px solid #64748b",borderRadius:8,background:selected===t.id?"#dbeafe":"transparent",color:selected===t.id?"#172554":"inherit"}}>
     <strong>{t.priority} · {t.itemNumber}</strong><div>{t.sourceBin} → {t.primaryBin} · {t.requestedQty} units</div><small>{t.status} {t.driver?"· "+t.driver:""}</small>
    </button>)}
   </div>
   {task&&<div className="panel" style={{padding:18,display:"grid",gap:12}}>
    <h2>Task {task.id}</h2>
    <p>Item {task.itemNumber} · Source {task.sourceBin} · Primary {task.primaryBin} · Qty {task.requestedQty}</p>
    <label>Lift driver<select value={driver} onChange={e=>setDriver(e.target.value)} style={{display:"block",padding:10,width:"100%"}}>{DRIVERS.map(d=><option key={d}>{d}</option>)}</select></label>
    <button type="button" disabled={task.status!=="OPEN"} onClick={()=>{setTasks(v=>assignDriver(v,task.id,driver));setMessage("Assigned in demo session only.")}}>Assign Driver</button>
    <button type="button" disabled={task.status!=="ASSIGNED"} onClick={()=>{setTasks(v=>beginTask(v,task.id));setMessage("Demo task started.")}}>Start Task</button>
    <label>Scan source bin<input value={source} onChange={e=>setSource(e.target.value)} placeholder={task.sourceBin} style={{display:"block",padding:10,width:"100%"}}/></label>
    <label>Scan primary destination<input value={destination} onChange={e=>setDestination(e.target.value)} placeholder={task.primaryBin} style={{display:"block",padding:10,width:"100%"}}/></label>
    <label>Scan item<input value={item} onChange={e=>setItem(e.target.value)} placeholder={task.itemNumber} style={{display:"block",padding:10,width:"100%"}}/></label>
    <label>Quantity moved<input type="number" min="1" step="1" value={qty} onChange={e=>setQty(e.target.value)} style={{display:"block",padding:10,width:"100%"}}/></label>
    <button type="button" disabled={task.status!=="IN_PROGRESS"} onClick={complete}>Verify & Complete (Demo)</button>
    <label>Exception reason<input value={note} onChange={e=>setNote(e.target.value)} placeholder="Short stock / damaged / wrong placard" style={{display:"block",padding:10,width:"100%"}}/></label>
    <button type="button" disabled={!["ASSIGNED","IN_PROGRESS"].includes(task.status)||!note.trim()} onClick={()=>{setTasks(v=>exceptionTask(v,task.id,note));setMessage("Exception recorded in demo session only.")}}>Flag Exception</button>
    {message&&<p role="status">{message}</p>}
   </div>}
  </div>
 </WmsPageShell>;
}
