"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, QrCode, RefreshCw, Search, Send, UserRound } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import WmsPageShell from "@/components/WmsPageShell";
import { supabase } from "@/lib/supabase/client";

type AssignmentLine = {
  id:string;
  assigned_qty:number;
  picked_qty:number;
  checked_qty:number;
  received_qty:number;
  location_verified:boolean;
  item_verified:boolean;
  transfer_lines?: {
    line_number?:number;
    bin_location?:string;
    item_number?:string;
    description?:string;
    ordered_qty?:number;
    available_qty?:number;
    uom?:string;
  } | null;
};

type Ticket = {
  id:string;
  ticket_code:string;
  status:string;
  assigned_user_id:string;
  created_at:string;
  transfers?: {
    id?:string;
    transfer_number?:string;
    source_branch_code?:string;
    destination_branch_code?:string;
    ship_to_name?:string;
    ship_to_address_1?:string;
    ship_to_city?:string;
    ship_to_state?:string;
    ship_to_postal_code?:string;
    transfer_date?:string;
    status?:string;
  } | null;
  profiles?: {
    first_name?:string;
    last_name?:string;
  } | null;
  transfer_assignment_lines?: AssignmentLine[];
};

export default function TransfersPage() {
  const [tickets,setTickets]=useState<Ticket[]>([]);
  const [selected,setSelected]=useState<Ticket|null>(null);
  const [query,setQuery]=useState("");
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [userId,setUserId]=useState("");

  async function load(){
    setLoading(true); setError("");
    const {data:userData}=await supabase.auth.getUser();
    const uid=userData.user?.id ?? "";
    setUserId(uid);

    const {data,error}=await supabase
      .from("transfer_assignments")
      .select("id,ticket_code,status,assigned_user_id,created_at,transfers(id,transfer_number,source_branch_code,destination_branch_code,ship_to_name,ship_to_address_1,ship_to_city,ship_to_state,ship_to_postal_code,transfer_date,status),profiles:profiles!transfer_assignments_assigned_user_id_fkey(first_name,last_name),transfer_assignment_lines(id,assigned_qty,picked_qty,checked_qty,received_qty,location_verified,item_verified,transfer_lines:transfer_lines!transfer_assignment_lines_transfer_line_id_fkey(line_number,bin_location,item_number,description,ordered_qty,available_qty,uom))")
      .order("created_at",{ascending:false});

    if(error) setError(error.message);
    const loaded=(data as unknown as Ticket[]|null)??[];
    setTickets(loaded);
    if(selected){
      setSelected(loaded.find(t=>t.id===selected.id)??null);
    }
    setLoading(false);
  }

  useEffect(()=>{load();},[]);

  const filtered=useMemo(()=>{
    const q=query.trim().toLowerCase();
    if(!q) return tickets;
    return tickets.filter(t=>[
      t.ticket_code,t.status,t.transfers?.transfer_number,t.transfers?.source_branch_code,
      t.transfers?.destination_branch_code,t.profiles?.first_name,t.profiles?.last_name
    ].filter(Boolean).some(v=>String(v).toLowerCase().includes(q)));
  },[query,tickets]);

  const myTickets=tickets.filter(t=>t.assigned_user_id===userId);

  function assignee(t:Ticket){
    const name=[t.profiles?.first_name,t.profiles?.last_name].filter(Boolean).join(" ").trim();
    return name||"Assigned Picker";
  }

  return (
    <WmsPageShell
      eyebrow="BRANCH MOVEMENT"
      title="Transfers"
      subtitle="Personal transfer tickets for picking, checking, shipping, and destination receiving."
    >
      {error ? <div className="notice dangerNotice">{error}</div> : null}

      <div className="summaryGrid">
        <div className="summaryCard"><small>My Tickets</small><strong>{myTickets.length}</strong></div>
        <div className="summaryCard"><small>Picking</small><strong>{tickets.filter(t=>t.status==="PICKING").length}</strong></div>
        <div className="summaryCard"><small>Ready for Receiving</small><strong>{tickets.filter(t=>t.status==="READY_FOR_RECEIVING").length}</strong></div>
        <div className="summaryCard"><small>Complete</small><strong>{tickets.filter(t=>t.status==="COMPLETE").length}</strong></div>
      </div>

      {myTickets.length ? (
        <section className="card">
          <div className="sectionTitle">
            <div><h2>My Transfer Tickets</h2><p>Each ticket is assigned to one picker and has its own QR for destination receiving.</p></div>
            <UserRound size={28}/>
          </div>
          <div className="ticketGrid">
            {myTickets.map(t=>(
              <button className="ticketCard" key={t.id} onClick={()=>setSelected(t)}>
                <QRCodeSVG value={"TRANSFER|"+t.ticket_code+"|"+(t.transfers?.transfer_number??"")} size={82} level="M"/>
                <div>
                  <strong>{t.transfers?.transfer_number ?? "Transfer"}</strong>
                  <span>{t.ticket_code}</span>
                  <small>{t.transfers?.source_branch_code} → {t.transfers?.destination_branch_code}</small>
                  <small>{t.status.replaceAll("_"," ")}</small>
                </div>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <section className="card">
        <div className="sectionTitle">
          <div><h2>Transfer Ticket Queue</h2><p>Supervisors can see assigned tickets in branches they manage; employees see their own ticket.</p></div>
          <button className="secondary" onClick={load}><RefreshCw size={16}/> Refresh</button>
        </div>
        <div className="searchInput pageSearch"><Search size={19}/><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search transfer, ticket, picker, branch..." /></div>
        <div className="tableWrap">
          <table>
            <thead><tr><th>Ticket</th><th>Transfer</th><th>Picker</th><th>From</th><th>To</th><th>Status</th><th>Open</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={7} className="empty">Loading personal transfer tickets...</td></tr> :
              filtered.length ? filtered.map(t=>(
                <tr key={t.id}>
                  <td><strong>{t.ticket_code}</strong></td>
                  <td>{t.transfers?.transfer_number ?? "—"}</td>
                  <td>{assignee(t)}</td>
                  <td>{t.transfers?.source_branch_code ?? "—"}</td>
                  <td>{t.transfers?.destination_branch_code ?? "—"}</td>
                  <td><span className="status green">{t.status.replaceAll("_"," ")}</span></td>
                  <td><button className="miniButton" onClick={()=>setSelected(t)}><QrCode size={14}/> Ticket</button></td>
                </tr>
              )) : <tr><td colSpan={7} className="empty"><Send size={26}/> No transfer tickets assigned yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {selected ? (
        <div className="modalBackdrop">
          <div className="modal transferTicketModal">
            <div className="modalHeader">
              <div>
                <p className="eyebrow">PERSONAL TRANSFER TICKET</p>
                <h2>{selected.transfers?.transfer_number}</h2>
                <p className="muted">{assignee(selected)} · {selected.ticket_code}</p>
              </div>
              <button className="iconButton" onClick={()=>setSelected(null)}>×</button>
            </div>

            <div className="transferTicketTop">
              <div>
                <small>FROM</small>
                <strong>{selected.transfers?.source_branch_code}</strong>
              </div>
              <div>
                <small>SHIP TO</small>
                <strong>{selected.transfers?.destination_branch_code}</strong>
                <span>{selected.transfers?.ship_to_name}</span>
                <span>{selected.transfers?.ship_to_address_1}</span>
                <span>{selected.transfers?.ship_to_city}{selected.transfers?.ship_to_state ? ", "+selected.transfers.ship_to_state : ""} {selected.transfers?.ship_to_postal_code}</span>
              </div>
              <div className="ticketQrBlock">
                <QRCodeSVG value={"TRANSFER|"+selected.ticket_code+"|"+(selected.transfers?.transfer_number??"")} size={110} level="M"/>
                <small>Receiving scans this QR</small>
              </div>
            </div>

            <div className="tableWrap">
              <table>
                <thead><tr><th>Bin</th><th>Item</th><th>Order</th><th>Assigned</th><th>Picked</th><th>Checked</th><th>Avail</th><th>Description</th><th>UM</th></tr></thead>
                <tbody>
                  {(selected.transfer_assignment_lines??[]).length ? (selected.transfer_assignment_lines??[]).map(line=>(
                    <tr key={line.id}>
                      <td><strong>{line.transfer_lines?.bin_location ?? "—"}</strong></td>
                      <td>{line.transfer_lines?.item_number ?? "—"}</td>
                      <td>{line.transfer_lines?.ordered_qty ?? 0}</td>
                      <td>{line.assigned_qty}</td>
                      <td>{line.picked_qty}</td>
                      <td>{line.checked_qty}</td>
                      <td>{line.transfer_lines?.available_qty ?? "—"}</td>
                      <td>{line.transfer_lines?.description ?? "—"}</td>
                      <td>{line.transfer_lines?.uom ?? "EA"}</td>
                    </tr>
                  )) : <tr><td colSpan={9} className="empty">No assigned lines on this ticket yet.</td></tr>}
                </tbody>
              </table>
            </div>

            <div className="modalActions">
              <button className="secondary" onClick={()=>window.print()}><QrCode size={16}/> Print Ticket / QR</button>
              <button className="primary" onClick={()=>setSelected(null)}><CheckCircle2 size={16}/> Done</button>
            </div>
          </div>
        </div>
      ) : null}
    </WmsPageShell>
  );
}
