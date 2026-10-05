"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText, RefreshCw, Search } from "lucide-react";
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
              <tr><th>Document</th><th>Type</th><th>Vendor</th><th>Branch</th><th>Date</th><th>Status</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="empty">Loading purchase orders...</td></tr>
              ) : filtered.length ? filtered.map((row) => (
                <tr key={row.id}>
                  <td><strong>{row.document_number}</strong></td>
                  <td>{row.document_type.replace("_"," ")}</td>
                  <td>{row.vendor_code ? row.vendor_code + " - " : ""}{row.vendor_name ?? "—"}</td>
                  <td>{row.branch_code}</td>
                  <td>{row.document_date ?? "—"}</td>
                  <td><span className="status green">{row.status}</span></td>
                </tr>
              )) : (
                <tr><td colSpan={6} className="empty"><FileText size={26}/> No PO records yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </WmsPageShell>
  );
}
