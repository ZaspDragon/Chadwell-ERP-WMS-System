"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Search, Send } from "lucide-react";
import WmsPageShell from "@/components/WmsPageShell";
import { supabase } from "@/lib/supabase/client";

type Row = {
  id: string;
  document_number: string;
  branch_code: string;
  vendor_code: string | null;
  vendor_name: string | null;
  document_date: string | null;
  status: string;
};

export default function TransfersPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    const { data, error } = await supabase
      .from("receiving_documents")
      .select("id,document_number,branch_code,vendor_code,vendor_name,document_date,status")
      .eq("document_type", "TRANSFER")
      .order("document_date", { ascending: false });

    if (error) setError(error.message);
    setRows((data as Row[] | null) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      [row.document_number,row.branch_code,row.vendor_code,row.vendor_name,row.status]
        .filter(Boolean).some((v)=>String(v).toLowerCase().includes(q))
    );
  }, [query, rows]);

  return (
    <WmsPageShell
      eyebrow="BRANCH MOVEMENT"
      title="Transfers"
      subtitle="Track inbound branch transfers from shipment through receipt."
    >
      <div className="summaryGrid">
        <div className="summaryCard"><small>Total Transfers</small><strong>{rows.length}</strong></div>
        <div className="summaryCard"><small>Open</small><strong>{rows.filter(r=>r.status==="OPEN").length}</strong></div>
        <div className="summaryCard"><small>Receiving</small><strong>{rows.filter(r=>r.status==="RECEIVING").length}</strong></div>
        <div className="summaryCard"><small>Complete</small><strong>{rows.filter(r=>["RECEIVED","CLOSED"].includes(r.status)).length}</strong></div>
      </div>

      <section className="card">
        <div className="sectionTitle">
          <div><h2>Transfer Queue</h2><p>SXFR/XFR and future transfer documents appear here.</p></div>
          <button className="secondary" onClick={load}><RefreshCw size={16}/> Refresh</button>
        </div>
        <div className="searchInput pageSearch"><Search size={19}/><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search transfer, branch, status..." /></div>
        {error ? <div className="notice dangerNotice">{error}</div> : null}
        <div className="tableWrap">
          <table>
            <thead><tr><th>Transfer #</th><th>From / Source</th><th>To Branch</th><th>Date</th><th>Status</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={5} className="empty">Loading transfers...</td></tr> :
              filtered.length ? filtered.map((row)=>(
                <tr key={row.id}>
                  <td><strong>{row.document_number}</strong></td>
                  <td>{row.vendor_code ? row.vendor_code + " - " : ""}{row.vendor_name ?? "—"}</td>
                  <td>{row.branch_code}</td>
                  <td>{row.document_date ?? "—"}</td>
                  <td><span className="status green">{row.status}</span></td>
                </tr>
              )) : <tr><td colSpan={5} className="empty"><Send size={26}/> No transfer records yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </WmsPageShell>
  );
}
