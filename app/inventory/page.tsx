"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRightLeft, Box, Pencil, RefreshCw, Search } from "lucide-react";
import WmsPageShell from "@/components/WmsPageShell";
import { supabase } from "@/lib/supabase/client";

type Row = {
  id:string;
  on_hand:number;
  allocated:number;
  on_hold:number;
  updated_at:string|null;
  items?: { item_number?:string; description?:string } | null;
  warehouse_locations?: { location_code?:string; zone?:string } | null;
  branches?: { code?:string } | null;
};

type Movement = {
  id:string;
  movement_type:string;
  quantity:number;
  from_location:string|null;
  to_location:string|null;
  created_by:string|null;
  created_at:string|null;
};

export default function InventoryPage(){
  const [rows,setRows]=useState<Row[]>([]);
  const [query,setQuery]=useState("");
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [historyFor,setHistoryFor]=useState<Row|null>(null);
  const [movements,setMovements]=useState<Movement[]>([]);
  const [historyLoading,setHistoryLoading]=useState(false);
  const [actionRow,setActionRow]=useState<Row|null>(null);
  const [actionType,setActionType]=useState<"MOVE"|"ADJUST"|null>(null);
  const [destination,setDestination]=useState("");
  const [moveQty,setMoveQty]=useState(1);
  const [newOnHand,setNewOnHand]=useState(0);
  const [reason,setReason]=useState("");
  const [notice,setNotice]=useState("");

  async function load(){
    setLoading(true); setError("");
    const {data,error}=await supabase.from("inventory_balances")
      .select("id,on_hand,allocated,on_hold,updated_at,items(item_number,description),warehouse_locations(location_code,zone),branches(code)")
      .order("updated_at",{ascending:false});
    if(error) setError(error.message);
    setRows((data as unknown as Row[]|null)??[]);
    setLoading(false);
  }

  useEffect(()=>{load();},[]);

  async function openHistory(row:Row){
    setHistoryFor(row);
    setHistoryLoading(true);
    setError("");
    const {data,error}=await supabase
      .from("inventory_movements")
      .select("id,movement_type,quantity,from_location,to_location,created_by,created_at")
      .eq("item_number",row.items?.item_number ?? "")
      .eq("branch_code",row.branches?.code ?? "")
      .order("created_at",{ascending:false})
      .limit(100);
    if(error) setError(error.message);
    setMovements((data as Movement[]|null)??[]);
    setHistoryLoading(false);
  }

  async function submitInventoryAction(){
    if(!actionRow || !actionType) return;
    setError(""); setNotice("");
    if(actionType==="MOVE"){
      const {error}=await supabase.rpc("move_inventory",{
        p_inventory_balance_id:actionRow.id,
        p_to_location_code:destination.trim(),
        p_quantity:moveQty,
        p_reason:reason.trim()||null
      });
      if(error){setError(error.message);return;}
      setNotice("Inventory move posted successfully.");
    } else {
      const {error}=await supabase.rpc("adjust_inventory",{
        p_inventory_balance_id:actionRow.id,
        p_new_on_hand:newOnHand,
        p_reason:reason.trim()
      });
      if(error){setError(error.message);return;}
      setNotice("Inventory adjustment posted and audited.");
    }
    setActionRow(null);setActionType(null);setDestination("");setReason("");
    await load();
  }

  const filtered=useMemo(()=>{
    const q=query.trim().toLowerCase();
    if(!q) return rows;
    return rows.filter(r=>[r.items?.item_number,r.items?.description,r.warehouse_locations?.location_code,r.warehouse_locations?.zone,r.branches?.code].filter(Boolean).some(v=>String(v).toLowerCase().includes(q)));
  },[query,rows]);

  const onHand=rows.reduce((s,r)=>s+Number(r.on_hand||0),0);
  const allocated=rows.reduce((s,r)=>s+Number(r.allocated||0),0);
  const hold=rows.reduce((s,r)=>s+Number(r.on_hold||0),0);

  return (
    <WmsPageShell eyebrow="INVENTORY CONTROL" title="Inventory" subtitle="Live WMS quantity by item, branch, and verified warehouse location.">
      {notice ? <div className="notice">{notice}</div> : null}
      <div className="summaryGrid">
        <div className="summaryCard"><small>Inventory Records</small><strong>{rows.length}</strong></div>
        <div className="summaryCard"><small>On Hand</small><strong>{onHand}</strong></div>
        <div className="summaryCard"><small>Allocated</small><strong>{allocated}</strong></div>
        <div className="summaryCard"><small>On Hold</small><strong>{hold}</strong></div>
      </div>

      <section className="card">
        <div className="sectionTitle">
          <div><h2>Inventory Lookup</h2><p>Search item number, description, bin, zone, or branch.</p></div>
          <button className="secondary" onClick={load}><RefreshCw size={16}/> Refresh</button>
        </div>
        <div className="searchInput pageSearch"><Search size={19}/><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search item, location, or branch..." /></div>
        {error ? <div className="notice dangerNotice">{error}</div> : null}
        <div className="tableWrap">
          <table>
            <thead><tr><th>Item</th><th>Description</th><th>Location</th><th>Branch</th><th>On Hand</th><th>Allocated</th><th>Available</th><th>Hold</th><th>Action</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={9} className="empty">Loading inventory...</td></tr> :
              filtered.length ? filtered.map(r=>(
                <tr key={r.id}>
                  <td><strong>{r.items?.item_number ?? "—"}</strong></td><td>{r.items?.description ?? "—"}</td><td>{r.warehouse_locations?.location_code ?? "—"}</td><td>{r.branches?.code ?? "—"}</td>
                  <td>{r.on_hand}</td><td>{r.allocated}</td><td>{Number(r.on_hand)-Number(r.allocated)-Number(r.on_hold)}</td><td>{r.on_hold}</td><td>
  <div className="inlineActions">
    <button className="miniButton" onClick={()=>openHistory(r)}>History</button>
    <button className="miniButton" onClick={()=>{setActionRow(r);setActionType("MOVE");setMoveQty(1);setDestination("");setReason("");}}><ArrowRightLeft size={14}/> Move</button>
    <button className="miniButton" onClick={()=>{setActionRow(r);setActionType("ADJUST");setNewOnHand(Number(r.on_hand));setReason("");}}><Pencil size={14}/> Adjust</button>
  </div>
</td>
                </tr>
              )) : <tr><td colSpan={7} className="empty"><Box size={26}/> No inventory balances yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {actionRow && actionType ? (
        <div className="modalBackdrop">
          <div className="modal">
            <div className="modalHeader">
              <div>
                <p className="eyebrow">{actionType==="MOVE" ? "INVENTORY MOVE" : "INVENTORY ADJUSTMENT"}</p>
                <h2>{actionRow.items?.item_number}</h2>
                <p className="muted">{actionRow.warehouse_locations?.location_code} · {actionRow.branches?.code}</p>
              </div>
              <button className="iconButton" onClick={()=>{setActionRow(null);setActionType(null);}}>×</button>
            </div>
            {actionType==="MOVE" ? (
              <>
                <label>Destination Location</label>
                <input value={destination} onChange={(e)=>setDestination(e.target.value)} placeholder="Scan destination bin"/>
                <label>Quantity</label>
                <input type="number" min={1} value={moveQty} onChange={(e)=>setMoveQty(Math.max(1,Number(e.target.value)||1))}/>
              </>
            ) : (
              <>
                <label>New On-Hand Quantity</label>
                <input type="number" min={0} value={newOnHand} onChange={(e)=>setNewOnHand(Math.max(0,Number(e.target.value)||0))}/>
              </>
            )}
            <label>Reason</label>
            <textarea rows={3} value={reason} onChange={(e)=>setReason(e.target.value)} placeholder="Required for adjustment; recommended for moves."/>
            <div className="modalActions">
              <button className="secondary" onClick={()=>{setActionRow(null);setActionType(null);}}>Cancel</button>
              <button className="primary" onClick={submitInventoryAction}>{actionType==="MOVE" ? "Post Move" : "Post Adjustment"}</button>
            </div>
          </div>
        </div>
      ) : null}

      {historyFor ? (
        <div className="modalBackdrop">
          <div className="modal transferTicketModal">
            <div className="modalHeader">
              <div><p className="eyebrow">ITEM HISTORY</p><h2>{historyFor.items?.item_number}</h2><p className="muted">{historyFor.warehouse_locations?.location_code} · {historyFor.branches?.code}</p></div>
              <button className="iconButton" onClick={()=>setHistoryFor(null)}>×</button>
            </div>
            <div className="tableWrap">
              <table>
                <thead><tr><th>Time</th><th>Type</th><th>Qty</th><th>From</th><th>To</th><th>User</th></tr></thead>
                <tbody>
                  {historyLoading ? <tr><td colSpan={6} className="empty">Loading movement history...</td></tr> :
                  movements.length ? movements.map(m=>(
                    <tr key={m.id}>
                      <td>{m.created_at ? new Date(m.created_at).toLocaleString() : "—"}</td>
                      <td><strong>{m.movement_type}</strong></td>
                      <td>{m.quantity}</td>
                      <td>{m.from_location ?? "—"}</td>
                      <td>{m.to_location ?? "—"}</td>
                      <td>{m.created_by ?? "—"}</td>
                    </tr>
                  )) : <tr><td colSpan={6} className="empty">No movement history found.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </WmsPageShell>
  );
}
