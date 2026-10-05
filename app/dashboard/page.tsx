"use client";

import { useEffect, useState } from "react";
import { Box, FileText, PackageCheck, QrCode, RefreshCw, Send, Truck } from "lucide-react";
import WmsPageShell from "@/components/WmsPageShell";
import { supabase } from "@/lib/supabase/client";

type Counts = {
  openReceiving:number;
  transferTickets:number;
  openPallets:number;
  openPutaway:number;
  inventoryRecords:number;
  unreadNotifications:number;
};

export default function DashboardPage(){
  const [counts,setCounts]=useState<Counts>({openReceiving:0,transferTickets:0,openPallets:0,openPutaway:0,inventoryRecords:0,unreadNotifications:0});
  const [error,setError]=useState("");

  async function load(){
    setError("");
    const [
      receiving,transfers,pallets,putaway,inventory,notifications
    ]=await Promise.all([
      supabase.from("receiving_documents").select("id",{count:"exact",head:true}).in("status",["OPEN","RECEIVING"]),
      supabase.from("transfer_assignments").select("id",{count:"exact",head:true}).neq("status","COMPLETE"),
      supabase.from("pallets").select("id",{count:"exact",head:true}).in("status",["OPEN","READY_FOR_PUTAWAY","HOLD"]),
      supabase.from("putaway_tasks").select("id",{count:"exact",head:true}).neq("status","COMPLETE"),
      supabase.from("inventory_balances").select("id",{count:"exact",head:true}),
      supabase.from("notifications").select("id",{count:"exact",head:true}).is("read_at",null)
    ]);
    const firstError=[receiving.error,transfers.error,pallets.error,putaway.error,inventory.error,notifications.error].find(Boolean);
    if(firstError) setError(firstError.message);
    setCounts({
      openReceiving:receiving.count??0,
      transferTickets:transfers.count??0,
      openPallets:pallets.count??0,
      openPutaway:putaway.count??0,
      inventoryRecords:inventory.count??0,
      unreadNotifications:notifications.count??0
    });
  }

  useEffect(()=>{load();},[]);

  const cards=[
    {href:"/receiving",label:"Receiving",value:counts.openReceiving,sub:"Open / receiving documents",icon:Truck},
    {href:"/pos",label:"POs",value:counts.openReceiving,sub:"Inbound document workload",icon:FileText},
    {href:"/transfers",label:"Transfer Tickets",value:counts.transferTickets,sub:"Assigned and active tickets",icon:Send},
    {href:"/pallets",label:"Pallets / LPNs",value:counts.openPallets,sub:"Open, hold, or awaiting putaway",icon:QrCode},
    {href:"/putaway",label:"Putaway",value:counts.openPutaway,sub:"Tasks not yet completed",icon:PackageCheck},
    {href:"/inventory",label:"Inventory",value:counts.inventoryRecords,sub:"Location-level inventory records",icon:Box}
  ];

  return (
    <WmsPageShell eyebrow="WAREHOUSE CONTROL" title="Dashboard" subtitle="Live operational view across receiving, transfers, pallets, putaway, and inventory.">
      {error ? <div className="notice dangerNotice">{error}</div> : null}
      <div className="sectionTitle">
        <div><h2>Warehouse Workload</h2><p>{counts.unreadNotifications} unread leadership alert(s).</p></div>
        <button className="secondary" onClick={load}><RefreshCw size={16}/> Refresh</button>
      </div>
      <div className="dashboardGrid">
        {cards.map(({href,label,value,sub,icon:Icon})=>(
          <a href={href} className="dashboardCard" key={href}>
            <Icon size={24}/>
            <div><small>{label}</small><strong>{value}</strong><span>{sub}</span></div>
          </a>
        ))}
      </div>
    </WmsPageShell>
  );
}
