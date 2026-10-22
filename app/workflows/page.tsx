"use client";

import { useEffect, useRef, useState } from "react";
import WmsAuthGuard from "@/components/WmsAuthGuard";
import WmsPageShell from "@/components/WmsPageShell";

type Step = { id: string; label: string; required: boolean; format: "text" | "number" | "barcode" };
type Workflow = { id: string; name: string; branch: string; module: string; steps: Step[] };
const STORAGE = "wms-workflow-drafts-v1";
const starter: Workflow[] = [
  { id: "receiving-oh01", name: "Receive PO to pallet", branch: "OH01", module: "Receiving", steps: [
    { id: "document", label: "PO / transfer number", required: true, format: "barcode" },
    { id: "pallet", label: "Pallet LPN / QR", required: true, format: "barcode" },
    { id: "item", label: "Item QR / barcode", required: true, format: "barcode" },
    { id: "quantity", label: "Received quantity", required: true, format: "number" },
    { id: "location", label: "Destination bin", required: true, format: "barcode" },
  ] },
  { id: "transfer-oh01", name: "Verify transfer picks", branch: "OH01", module: "Transfers", steps: [
    { id: "ticket", label: "Transfer ticket", required: true, format: "barcode" },
    { id: "item", label: "Picked item", required: true, format: "barcode" },
    { id: "quantity", label: "Picked quantity", required: true, format: "number" },
    { id: "bin", label: "Source bin", required: true, format: "barcode" },
  ] },
];
const clone = (value: Workflow[]) => JSON.parse(JSON.stringify(value)) as Workflow[];
function valid(data: unknown): data is Workflow[] {
  return Array.isArray(data) && data.length <= 100 && data.every(w =>
    w && typeof w.id === "string" && typeof w.name === "string" && typeof w.branch === "string" &&
    typeof w.module === "string" && Array.isArray(w.steps) && w.steps.length <= 50 &&
    w.steps.every((s: Step) => s && typeof s.id === "string" && typeof s.label === "string" &&
      typeof s.required === "boolean" && ["text","number","barcode"].includes(s.format)));
}
export default function WorkflowBuilder() {
  const [flows, setFlows] = useState<Workflow[]>(starter);
  const [index, setIndex] = useState(0);
  const [values, setValues] = useState<Record<string,string>>({});
  const [notice, setNotice] = useState("Draft mode: no inventory transactions are posted.");
  const [camera, setCamera] = useState(false);
  const [cameraTarget, setCameraTarget] = useState("");
  const inputFile = useRef<HTMLInputElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const flow = flows[index] ?? flows[0];

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (valid(parsed) && parsed.length) setFlows(parsed);
      }
    } catch { /* keep defaults if browser storage is unavailable */ }
  }, []);
  useEffect(() => {
    try { localStorage.setItem(STORAGE, JSON.stringify(flows)); } catch {}
  }, [flows]);

  function updateFlow(patch: Partial<Workflow>) {
    setFlows(prev => prev.map((w,i) => i===index ? {...w,...patch} : w));
  }
  function updateStep(stepIndex:number, patch: Partial<Step>) {
    updateFlow({steps:flow.steps.map((s,i) => i===stepIndex ? {...s,...patch} : s)});
  }
  function startNew() {
    const id = "workflow-" + Date.now();
    setFlows(prev=>[...prev,{id,name:"New workflow",branch:"OH01",module:"Custom",steps:[]}]);
    setIndex(flows.length);
    setValues({});
  }
  function exportConfig() {
    const blob = new Blob([JSON.stringify(flows,null,2)],{type:"application/json"});
    const url = URL.createObjectURL(blob);
    const anchor=document.createElement("a"); anchor.href=url; anchor.download="wms-workflow-config.json";anchor.click();
    URL.revokeObjectURL(url);
  }
  async function importConfig(file?:File) {
    if(!file) return;
    try {
      if(file.size>1024*1024) throw new Error("Configuration must be under 1 MB.");
      const parsed:unknown=JSON.parse(await file.text());
      if(!valid(parsed) || !parsed.length) throw new Error("Invalid workflow configuration.");
      setFlows(clone(parsed));setIndex(0);setValues({});
      setNotice("Workflow drafts imported. No live warehouse data was changed.");
    } catch(e) {setNotice(e instanceof Error?e.message:"Import failed.");}
  }
  function test() {
    const missing=flow.steps.filter(s=>s.required&&!values[s.id]?.trim());
    const invalid=flow.steps.filter(s=>s.format==="number"&&values[s.id]?.trim()&&!(Number(values[s.id])>0));
    if(missing.length || invalid.length) {
      setNotice("Validation failed: " + [...missing.map(s=>s.label+" is required"),...invalid.map(s=>s.label+" must be greater than zero")].join("; "));
    } else setNotice("Workflow validation passed. Simulation only — nothing was posted.");
  }
  useEffect(()=>{
    if(!camera) return;
    let ended=false;
    let raf=0;
    let scanner: {detect:(source:HTMLVideoElement)=>Promise<Array<{rawValue:string}>>}|null=null;
    async function activate(){
      try {
        const Detector=(window as unknown as {BarcodeDetector?:new(opts:{formats:string[]})=>typeof scanner}).BarcodeDetector;
        if(!Detector) throw new Error("This browser does not support camera barcode detection. Use a USB/Bluetooth scanner or manual entry.");
        scanner=new Detector({formats:["qr_code","code_128","ean_13","upc_a","data_matrix"]});
        const media=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"}},audio:false});
        if(ended){media.getTracks().forEach(t=>t.stop());return;}
        stream.current=media;
        if(video.current){video.current.srcObject=media;await video.current.play();}
        async function scan(){
          if(ended)return;
          try {
            if(video.current?.readyState===4&&scanner){
              const found=await scanner.detect(video.current);
              if(found[0]?.rawValue){
                setValues(p=>({...p,[cameraTarget]:found[0].rawValue}));
                setNotice("Scanned "+cameraTarget+". Review before submitting.");
                setCamera(false);return;
              }
            }
          }catch{}
          raf=requestAnimationFrame(scan);
        }
        raf=requestAnimationFrame(scan);
      }catch(e){setNotice(e instanceof Error?e.message:"Camera unavailable.");setCamera(false);}
    }
    void activate();
    return()=>{ended=true;cancelAnimationFrame(raf);stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;};
  },[camera,cameraTarget]);

  return <WmsAuthGuard><WmsPageShell eyebrow="CONFIGURATION / PILOT" title="Plug-and-Play Workflow Builder" subtitle="Configure branch processes and test scans without changing live inventory.">
    <div className="card">
      <h2>Workflow templates</h2>
      <p className="muted">Drafts are saved only in this browser. Export JSON to move them to another device. Central deployment and role approvals are not yet enabled.</p>
      <div style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:14}}>
        <select aria-label="Choose workflow" value={index} onChange={e=>{setIndex(Number(e.target.value));setValues({});}} style={{padding:10,minWidth:220}}>
          {flows.map((w,i)=><option key={w.id} value={i}>{w.branch} · {w.name}</option>)}
        </select>
        <button className="secondary" onClick={startNew}>+ New workflow</button>
        <button className="secondary" onClick={exportConfig}>Export configuration</button>
        <button className="secondary" onClick={()=>inputFile.current?.click()}>Import JSON</button>
        <input ref={inputFile} type="file" accept="application/json,.json" hidden onChange={e=>void importConfig(e.target.files?.[0])}/>
      </div>
    </div>
    <div className="twoCol">
      <section className="card">
        <h2>1. Configure process</h2>
        <label>Workflow name<input style={{display:"block",width:"100%",padding:10,marginBottom:10}} value={flow.name} onChange={e=>updateFlow({name:e.target.value})}/></label>
        <label>Branch<input style={{display:"block",width:"100%",padding:10,marginBottom:10}} value={flow.branch} onChange={e=>updateFlow({branch:e.target.value.toUpperCase()})}/></label>
        <label>Module<select style={{display:"block",width:"100%",padding:10,marginBottom:12}} value={flow.module} onChange={e=>updateFlow({module:e.target.value})}>
          {["Receiving","Transfers","Putaway","Inventory","Picking","Cycle Counts","Custom"].map(m=><option key={m}>{m}</option>)}
        </select></label>
        {flow.steps.map((s,i)=><div key={s.id} style={{border:"1px solid #dfe6ed",padding:12,borderRadius:10,marginBottom:8}}>
          <input aria-label={"Step "+(i+1)+" label"} value={s.label} onChange={e=>updateStep(i,{label:e.target.value})} style={{padding:8,width:"100%",marginBottom:8}}/>
          <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
            <select aria-label="Field type" value={s.format} onChange={e=>updateStep(i,{format:e.target.value as Step["format"]})}>
              <option value="barcode">Barcode / QR</option><option value="text">Text</option><option value="number">Quantity</option>
            </select>
            <label><input type="checkbox" checked={s.required} onChange={e=>updateStep(i,{required:e.target.checked})}/> Required</label>
            <button className="secondary" onClick={()=>updateFlow({steps:flow.steps.filter((_,j)=>j!==i)})}>Remove</button>
          </div>
        </div>)}
        <button className="secondary" onClick={()=>updateFlow({steps:[...flow.steps,{id:"field-"+Date.now(),label:"New scan field",required:true,format:"barcode"}]})}>+ Add scan / field</button>
      </section>
      <section className="card">
        <h2>2. Test on a device</h2>
        <p className="muted">USB/Bluetooth scanners in keyboard mode can scan directly into the focused field. Camera scanning requires HTTPS and browser support.</p>
        {flow.steps.map(s=><label key={s.id} style={{display:"block",marginTop:12,fontWeight:650}}>
          {s.label}{s.required?" *":""}
          <div style={{display:"flex",gap:8,marginTop:5}}>
            <input type={s.format==="number"?"number":"text"} inputMode={s.format==="number"?"numeric":"text"} value={values[s.id]??""} onChange={e=>setValues(v=>({...v,[s.id]:e.target.value}))} style={{padding:11,width:"100%",minWidth:0}} placeholder={s.format==="barcode"?"Focus and scan, or type":"Enter value"}/>
            {s.format==="barcode"&&<button type="button" className="secondary" onClick={()=>{setCameraTarget(s.id);setCamera(true);}}>Camera</button>}
          </div>
        </label>)}
        {camera&&<div style={{marginTop:14}}><video ref={video} muted playsInline style={{width:"100%",maxHeight:290,background:"#111",borderRadius:8}}/><button className="secondary" onClick={()=>setCamera(false)}>Close camera</button></div>}
        <p className="notice" role="status" style={{marginTop:16}}>{notice}</p>
        <button className="primary" onClick={test}>Validate workflow (simulation)</button>
        <button className="secondary" style={{marginLeft:8}} onClick={()=>setValues({})}>Clear test</button>
      </section>
    </div>
  </WmsPageShell></WmsAuthGuard>;
}
