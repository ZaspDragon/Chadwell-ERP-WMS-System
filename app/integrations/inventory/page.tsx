"use client";
import {useMemo,useState} from "react";
import WmsPageShell from "@/components/WmsPageShell";
import {filterStock,previewStockImport,type ImportPreview} from "@/lib/integrations/external-inventory";

export default function ExternalInventoryPage(){
 const [preview,setPreview]=useState<ImportPreview|null>(null),[warehouse,setWarehouse]=useState("ALL"),[search,setSearch]=useState(""),[source,setSource]=useState("Great Plains / BinMgr"),[error,setError]=useState(""),[filename,setFilename]=useState("");
 const visible=useMemo(()=>filterStock(preview?.rows||[],warehouse,search),[preview,warehouse,search]);
 async function load(file:File|undefined){if(!file)return;setError("");setPreview(null);setWarehouse("ALL");setFilename(file.name);
  if(file.size>5_000_000){setError("File too large. Use a CSV export under 5 MB.");return}
  try{const text=await file.text();setPreview(previewStockImport(text,source))}catch(e){setError(e instanceof Error?e.message:"Could not parse file")}
 }
 return <WmsPageShell eyebrow="CHADWMS / Integrations" title="External Warehouse Inventory" subtitle="Preview and separate inventory by warehouse, bin and item before connecting an existing ERP/WMS.">
  <section className="card" style={{padding:20,marginBottom:16}}>
   <h2>Import a warehouse inventory export</h2>
   <p className="muted">Read-only local preview. Select a CSV from your existing system. Nothing is uploaded to the server or written to CHADWMS inventory.</p>
   <p>Required headers: <code>warehouse,bin,item,on_hand</code>. Optional: <code>allocated,on_hold,description</code>.</p>
   <label>Source system<input value={source} onChange={e=>setSource(e.target.value)} style={{display:"block",padding:10,width:"100%",maxWidth:400}}/></label>
   <label style={{display:"block",marginTop:12}}>Inventory CSV<input type="file" accept=".csv,text/csv" onChange={e=>void load(e.target.files?.[0])} style={{display:"block",padding:10}}/></label>
   {filename&&<p>Selected: {filename}</p>}
   {error&&<p role="alert" style={{color:"crimson"}}>{error}</p>}
  </section>
  {preview&&<>
   <section className="card" style={{padding:20,marginBottom:16}}>
    <h2>{preview.warehouses.length} warehouses · {preview.rows.length} unique bin/item records</h2>
    <p>{preview.issues.length} rejected lines · {preview.duplicateKeys.length} duplicate keys. Invalid lines are excluded rather than silently merged.</p>
    <div style={{display:"flex",flexWrap:"wrap",gap:12}}>
     <label>Warehouse<select value={warehouse} onChange={e=>setWarehouse(e.target.value)} style={{display:"block",padding:10}}><option value="ALL">All warehouses</option>{preview.warehouses.map(w=><option key={w}>{w}</option>)}</select></label>
     <label>Find bin or item<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Bin, item or description" style={{display:"block",padding:10}}/></label>
    </div>
    <div style={{overflowX:"auto",marginTop:12}}><table style={{width:"100%",textAlign:"left"}}>
     <thead><tr>{["Warehouse","Bin","Item","Description","On hand","Allocated","On hold"].map(x=><th key={x} style={{padding:8}}>{x}</th>)}</tr></thead>
     <tbody>{visible.slice(0,500).map(r=><tr key={[r.warehouse,r.bin,r.item].join("|")}>
      {[r.warehouse,r.bin,r.item,r.description,r.onHand,r.allocated,r.onHold].map((v,i)=><td key={i} style={{padding:8}}>{v}</td>)}
     </tr>)}</tbody>
    </table></div>
    {visible.length>500&&<p>Showing first 500 of {visible.length} matching rows. Filter by warehouse or item.</p>}
   </section>
   {preview.issues.length>0&&<section className="card" style={{padding:20}}><h2>Import issues</h2>{preview.issues.slice(0,30).map((e,i)=><p key={i}>Line {e.line}: {e.reason}</p>)}{preview.issues.length>30&&<p>Showing first 30 issues.</p>}</section>}
  </>}
 </WmsPageShell>;
}
