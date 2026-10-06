"use client";

import { useEffect, useMemo, useState } from "react";
import { CirclePause, CirclePlay, FileText, RefreshCw, Search } from "lucide-react";
import WmsPageShell from "@/components/WmsPageShell";
import { supabase } from "@/lib/supabase/client";

type Row = {
  id: string;
  document_number: string;
  document_type: string;
  branch_code: string;
  vendor_code: string | null;
  vendor_name: string | null;
  document_date: string | null;
  status: string;
  updated_at: string | null;
};

export default function PurchaseOrdersPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState<Row | null>(null);
  const [holdReason, setHoldReason] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    const { data, error } = await supabase
      .from("receiving_documents")
      .select("id,document_number,document_type,branch_code,vendor_code,vendor_name,document_date,status,updated_at")
      .in("document_type", ["PO", "PO_EDI", "SPO"])
      .order("document_date", { ascending: false });

    if (error) setError(error.message);
    setRows((data as Row[] | null) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function toggleHold(row: Row) {
    setError("");
    setNotice("");
    const hold = row.status !== "EXCEPTION";
    const { error } = await supabase.rpc("set_receiving_document_hold", {
      p_document_id: row.id,
      p_hold: hold,
      p_reason: hold ? holdReason.trim() || "Receiving hold" : "Released from hold",
    });
    if (error) {
      setError(error.message);
      return;
    }
    setNotice(row.document_number + (hold ? " placed on hold." : " released from hold."));
    setSelected(null);
    setHoldReason("");
    await load();
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      [row.document_number, row.document_type, row.vendor_code, row.vendor_name, row.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  }, [query, rows]);

  const open = rows.filter((r) => r.status === "OPEN").length;
  const receiving = rows.filter((r) => r.status === "RECEIVING").length;
  const complete = rows.filter((r) => ["RECEIVED", "CLOSED"].includes(r.status)).length;

  return (
    <WmsPageShell
      eyebrow="INBOUND DOCUMENTS"
      title="Purchase Orders"
      subtitle="PO, PO EDI, and SPO receiving documents."
    >
      {notice ? <div className="notice">{notice}</div> : null}
      <div className="summaryGrid">
        <div className="summaryCard"><small>Total POs</small><strong>{rows.length}</strong></div>
        <div className="summaryCard"><small>Open</small><strong>{open}</strong></div>
        <div className="summaryCard"><small>Receiving</small><strong>{receiving}</strong></div>
        <div className="summaryCard"><small>Completed</small><strong>{complete}</strong></div>
      </div>

      <section className="card">
        <div className="sectionTitle">
          <div>
            <h2>PO Queue</h2>
            <p>Search by PO number, vendor, type, or status.</p>
          </div>
          <button className="secondary" onClick={load}><RefreshCw size={16}/> Refresh</button>
        </div>

        <div className="searchInput pageSearch">
          <Search size={19}/>
          <input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search PO, vendor, type, status..." />
        </div>

        {error ? <div className="notice dangerNotice">{error}</div> : null}

        <div className="tableWrap">
          <table>
            <thead>
              <tr><th>Document</th><th>Type</th><th>Vendor</th><th>Branch</th><th>Date</th><th>Status</th><th>Action</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="empty">Loading purchase orders...</td></tr>
              ) : filtered.length ? filtered.map((row) => (
                <tr key={row.id}>
                  <td><strong>{row.document_number}</strong></td>
                  <td>{row.document_type.replace("_"," ")}</td>
                  <td>{row.vendor_code ? row.vendor_code + " - " : ""}{row.vendor_name ?? "—"}</td>
                  <td>{row.branch_code}</td>
                  <td>{row.document_date ?? "—"}</td>
                  <td><span className="status green">{row.status}</span></td>
                  <td>
  <div className="inlineActions">
    <a className="miniButton" href={"/receiving?document="+encodeURIComponent(row.document_number)}>Receive</a>
    <button className="miniButton" onClick={()=>{setSelected(row);setHoldReason("");}}>
      {row.status==="EXCEPTION" ? <CirclePlay size={14}/> : <CirclePause size={14}/>}
      {row.status==="EXCEPTION" ? "Release" : "Hold"}
    </button>
  </div>
</td>
                </tr>
              )) : (
                <tr><td colSpan={6} className="empty"><FileText size={26}/> No PO records yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selected ? (
        <div className="modalBackdrop">
          <div className="modal">
            <div className="modalHeader">
              <div><p className="eyebrow">PO CONTROL</p><h2>{selected.document_number}</h2><p className="muted">{selected.branch_code} · {selected.status}</p></div>
              <button className="iconButton" onClick={()=>setSelected(null)}>×</button>
            </div>
            {selected.status!=="EXCEPTION" ? (
              <>
                <label>Hold Reason</label>
                <textarea rows={3} value={holdReason} onChange={(e)=>setHoldReason(e.target.value)} placeholder="Damage, vendor issue, count mismatch, approval, etc."/>
              </>
            ) : null}
            <div className="modalActions">
              <button className="secondary" onClick={()=>setSelected(null)}>Cancel</button>
              <button className={selected.status==="EXCEPTION" ? "success" : "danger"} onClick={()=>toggleHold(selected)}>
                {selected.status==="EXCEPTION" ? "Release Document" : "Place Document on Hold"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </WmsPageShell>
  );
}
