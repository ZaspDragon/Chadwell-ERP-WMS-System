"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  Box,
  CheckCircle2,
  ClipboardList,
  FileText,
  PackageCheck,
  Printer,
  QrCode,
  Search,
  Send,
  Truck,
} from "lucide-react";
import { demoDocuments, detectDocumentType } from "@/lib/receiving/mock-data";
import type { ReceivingDocument, ReceivingExceptionType, ReceivingPallet } from "@/lib/receiving/types";

const typeLabels = {
  PO: "PO",
  PO_EDI: "PO EDI",
  SPO: "SPO",
  TRANSFER: "TRANSFER",
};

export default function ReceivingPage() {
  const [query, setQuery] = useState("");
  const [activeDocument, setActiveDocument] = useState<ReceivingDocument | null>(demoDocuments[0]);
  const [pallets, setPallets] = useState<ReceivingPallet[]>([]);
  const [activePalletId, setActivePalletId] = useState<string | null>(null);
  const [scanValue, setScanValue] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [notice, setNotice] = useState("Ready to receive.");
  const [exceptionType, setExceptionType] = useState<ReceivingExceptionType>("SHORT");
  const [exceptionNotes, setExceptionNotes] = useState("");
  const [showException, setShowException] = useState(false);

  const activePallet = useMemo(
    () => pallets.find((p) => p.id === activePalletId) ?? null,
    [pallets, activePalletId]
  );

  function findDocument() {
    const normalized = query.trim().toUpperCase();
    if (!normalized) return;
    const found = demoDocuments.find((doc) => doc.documentNumber.toUpperCase() === normalized);
    if (found) {
      setActiveDocument(found);
      setNotice("Detected " + typeLabels[found.type] + " — " + found.documentNumber);
      return;
    }
    const detected = detectDocumentType(normalized);
    setNotice(typeLabels[detected] + " detected. This document is not in demo data yet; Supabase will load it once connected.");
  }

  function createPallet() {
    if (!activeDocument) return;
    const suffix = String(pallets.length + 1).padStart(4, "0");
    const id = "PLT-" + activeDocument.branch + "-" + new Date().getFullYear() + "-" + suffix;
    const pallet: ReceivingPallet = {
      id,
      documentNumber: activeDocument.documentNumber,
      branch: activeDocument.branch,
      status: "OPEN",
      createdAt: new Date().toISOString(),
      createdBy: "Current Receiver",
      lines: [],
    };
    setPallets((prev) => [...prev, pallet]);
    setActivePalletId(id);
    setNotice("Pallet " + id + " created. Scan an item to begin.");
  }

  function addItemToPallet() {
    if (!activeDocument) {
      setNotice("Open a receiving document first.");
      return;
    }
    if (!activePallet) {
      setNotice("Create or scan a pallet first.");
      return;
    }

    const normalized = scanValue.trim().toUpperCase();
    const line = activeDocument.lines.find(
      (item) =>
        item.itemNumber.toUpperCase() === normalized ||
        item.barcode?.toUpperCase() === normalized
    );

    if (!line) {
      setExceptionType("UNKNOWN_BARCODE");
      setExceptionNotes("Scanned value: " + scanValue);
      setShowException(true);
      return;
    }

    const remaining = Math.max(0, line.orderedQty - line.previouslyReceivedQty);
    if (quantity > remaining) {
      setExceptionType("OVER");
      setExceptionNotes("Attempted receipt: " + quantity + "; remaining expected: " + remaining);
      setShowException(true);
      return;
    }

    setPallets((prev) =>
      prev.map((pallet) => {
        if (pallet.id !== activePallet.id) return pallet;
        const existing = pallet.lines.find((item) => item.lineId === line.id);
        const lines = existing
          ? pallet.lines.map((item) =>
              item.lineId === line.id
                ? { ...item, quantity: item.quantity + quantity }
                : item
            )
          : [
              ...pallet.lines,
              {
                lineId: line.id,
                itemNumber: line.itemNumber,
                description: line.description,
                uom: line.uom,
                quantity,
              },
            ];
        return { ...pallet, lines };
      })
    );

    setNotice(quantity + " " + line.uom + " of " + line.itemNumber + " added to " + activePallet.id + ".");
    setScanValue("");
    setQuantity(1);
  }

  async function submitException() {
    const payload = {
      documentNumber: activeDocument?.documentNumber,
      branch: activeDocument?.branch,
      palletId: activePallet?.id,
      exceptionType,
      notes: exceptionNotes,
      timestamp: new Date().toISOString(),
    };

    try {
      const response = await fetch("/api/receiving/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      setNotice(
        result.delivered
          ? "Exception submitted and admin notification delivered."
          : "Exception recorded. Admin delivery will activate after notification setup."
      );
    } catch {
      setNotice("Exception captured locally, but notification delivery failed.");
    }
    setShowException(false);
    setExceptionNotes("");
  }

  function closePallet() {
    if (!activePallet) return;
    setPallets((prev) =>
      prev.map((p) =>
        p.id === activePallet.id ? { ...p, status: "READY_FOR_PUTAWAY" } : p
      )
    );
    setNotice(activePallet.id + " is ready for putaway.");
  }

  const totalOnPallet =
    activePallet?.lines.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brandMark">CW</div>
          <div>
            <strong>Chadwell WMS</strong>
            <small>Warehouse Operations</small>
          </div>
        </div>

        <nav>
          <a className="navItem" href="#"><ClipboardList size={18} /> Dashboard</a>
          <a className="navItem active" href="#"><Truck size={18} /> Receiving</a>
          <a className="navItem" href="#"><FileText size={18} /> POs</a>
          <a className="navItem" href="#"><Send size={18} /> Transfers</a>
          <a className="navItem" href="#"><QrCode size={18} /> Pallets / LPNs</a>
          <a className="navItem" href="#"><PackageCheck size={18} /> Putaway</a>
          <a className="navItem" href="#"><Box size={18} /> Inventory</a>
        </nav>

        <div className="sidebarFooter">
          <span className="dot" /> Demo mode
          <small>Supabase connection pending</small>
        </div>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">INBOUND OPERATIONS</p>
            <h1>Receiving</h1>
            <p className="muted">Scan PO, PO EDI, SPO, transfer, pallet, or item.</p>
          </div>
          <button className="iconButton" title="Notifications"><Bell size={20} /></button>
        </header>

        <div className="notice">{notice}</div>

        <section className="card scanCard">
          <div className="sectionTitle">
            <div>
              <h2>Start Receiving</h2>
              <p>Scan or enter the inbound document number.</p>
            </div>
          </div>
          <div className="searchRow">
            <div className="searchInput">
              <Search size={20} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && findDocument()}
                placeholder="Scan PO, PO EDI, SPO, or transfer..."
                autoFocus
              />
            </div>
            <button className="primary" onClick={findDocument}>Search</button>
          </div>

          <div className="typeGrid">
            <div className="typeCard"><FileText /><strong>PO</strong><small>Standard Purchase Order</small></div>
            <div className="typeCard"><FileText /><strong>PO EDI</strong><small>Electronic Purchase Order</small></div>
            <div className="typeCard"><PackageCheck /><strong>SPO</strong><small>Special Purchase Order</small></div>
            <div className="typeCard"><Send /><strong>TRANSFER</strong><small>Branch Transfer</small></div>
          </div>
        </section>

        {activeDocument && (
          <>
            <section className="card">
              <div className="documentHeader">
                <div>
                  <p className="eyebrow">RECEIVING DOCUMENT</p>
                  <h2>{activeDocument.documentNumber}</h2>
                </div>
                <span className="status green">{activeDocument.status}</span>
              </div>

              <div className="metadataGrid">
                <div><small>TYPE</small><strong>{typeLabels[activeDocument.type]}</strong></div>
                <div><small>BRANCH</small><strong>{activeDocument.branch}</strong></div>
                <div><small>VENDOR / FROM</small><strong>{activeDocument.vendorCode} - {activeDocument.vendorName}</strong></div>
                <div><small>DOCUMENT DATE</small><strong>{activeDocument.documentDate}</strong></div>
                <div><small>BUYER</small><strong>{activeDocument.buyer ?? "—"}</strong></div>
              </div>

              <div className="tableWrap">
                <table>
                  <thead>
                    <tr>
                      <th>Item #</th><th>Description</th><th>Bin</th><th>UOM</th>
                      <th>Qty Ordered</th><th>Prev Rec</th><th>Remaining</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeDocument.lines.length ? activeDocument.lines.map((line) => (
                      <tr key={line.id}>
                        <td><strong>{line.itemNumber}</strong></td>
                        <td>{line.description}</td>
                        <td>{line.bin}</td>
                        <td>{line.uom}</td>
                        <td>{line.orderedQty}</td>
                        <td>{line.previouslyReceivedQty}</td>
                        <td>{Math.max(0, line.orderedQty - line.previouslyReceivedQty)}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan={7} className="empty">Lines will load from Supabase for this document type.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <div className="twoCol">
              <section className="card">
                <div className="sectionTitle">
                  <div>
                    <h2>Pallet / LPN</h2>
                    <p>Create a pallet or scan an existing pallet label.</p>
                  </div>
                  <button className="secondary" onClick={createPallet}>+ New Pallet</button>
                </div>

                {activePallet ? (
                  <div className="palletSummary">
                    <div>
                      <small>ACTIVE PALLET</small>
                      <h3>{activePallet.id}</h3>
                      <span className={activePallet.status === "OPEN" ? "status amber" : "status green"}>
                        {activePallet.status.replaceAll("_", " ")}
                      </span>
                    </div>
                    <div className="bigNumber">
                      <strong>{totalOnPallet}</strong>
                      <span>Total Units</span>
                    </div>
                  </div>
                ) : (
                  <div className="emptyState">No pallet selected yet.</div>
                )}

                <div className="scanItem">
                  <label>Scan Item</label>
                  <input
                    value={scanValue}
                    onChange={(e) => setScanValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addItemToPallet()}
                    placeholder="Scan barcode or enter item number"
                  />
                  <div className="quantityRow">
                    <div>
                      <label>Quantity</label>
                      <input
                        type="number"
                        min={1}
                        value={quantity}
                        onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                      />
                    </div>
                    <button className="success" onClick={addItemToPallet}>Add to Pallet</button>
                  </div>
                </div>
              </section>

              <section className="card">
                <div className="sectionTitle">
                  <div>
                    <h2>Pallet Contents</h2>
                    <p>Everything physically verified on this pallet.</p>
                  </div>
                  <QrCode size={28} />
                </div>

                {activePallet?.lines.length ? (
                  <div className="palletLines">
                    {activePallet.lines.map((line) => (
                      <div className="palletLine" key={line.lineId}>
                        <div>
                          <strong>{line.itemNumber}</strong>
                          <p>{line.description}</p>
                        </div>
                        <span>{line.quantity} {line.uom}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="emptyState">Scan items to build this pallet.</div>
                )}

                <div className="actionGrid">
                  <button className="secondary" onClick={() => window.print()}><Printer size={17}/> Print / View</button>
                  <button className="dangerOutline" onClick={() => setShowException(true)}><AlertTriangle size={17}/> Report Problem</button>
                  <button className="primary" onClick={closePallet} disabled={!activePallet || !activePallet.lines.length}>
                    <CheckCircle2 size={17}/> Close Pallet
                  </button>
                </div>
              </section>
            </div>
          </>
        )}

        {showException && (
          <div className="modalBackdrop">
            <div className="modal">
              <div className="modalHeader">
                <div>
                  <p className="eyebrow dangerText">RECEIVING EXCEPTION</p>
                  <h2>Notify Receiving Admin</h2>
                </div>
                <button className="iconButton" onClick={() => setShowException(false)}>×</button>
              </div>

              <label>Exception Type</label>
              <select value={exceptionType} onChange={(e) => setExceptionType(e.target.value as ReceivingExceptionType)}>
                <option value="SHORT">Short Receipt</option>
                <option value="OVER">Over Receipt</option>
                <option value="DAMAGED">Damaged Product</option>
                <option value="WRONG_ITEM">Wrong Item</option>
                <option value="UNKNOWN_BARCODE">Unknown Barcode</option>
                <option value="DOCUMENT_MISMATCH">Document Mismatch</option>
                <option value="HOLD">Place on Hold</option>
              </select>

              <label>Notes</label>
              <textarea
                rows={4}
                value={exceptionNotes}
                onChange={(e) => setExceptionNotes(e.target.value)}
                placeholder="What did you find while checking the shipment?"
              />

              <div className="modalActions">
                <button className="secondary" onClick={() => setShowException(false)}>Cancel</button>
                <button className="danger" onClick={submitException}><Bell size={17}/> Submit & Notify Admin</button>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
