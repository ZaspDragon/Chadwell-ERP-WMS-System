"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  FileText,
  PackageCheck,
  Printer,
  QrCode,
  Search,
  Send,
  Sticker,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import WmsSidebar from "@/components/WmsSidebar";
import { supabase } from "@/lib/supabase/client";

type DocType = "PO" | "PO_EDI" | "SPO" | "TRANSFER";

type ReceivingLine = {
  id: string;
  item_id: string | null;
  item_number: string;
  description: string | null;
  bin: string | null;
  uom: string | null;
  ordered_qty: number;
  previously_received_qty: number;
  received_now_qty: number;
  barcode: string | null;
};

type ReceivingDocument = {
  id: string;
  document_number: string;
  document_type: DocType;
  branch_code: string;
  branch_id: string | null;
  vendor_code: string | null;
  vendor_name: string | null;
  document_date: string | null;
  buyer: string | null;
  status: string;
  lines: ReceivingLine[];
};

type PalletLine = {
  id: string;
  receiving_line_id: string | null;
  item_id: string | null;
  item_number: string;
  description: string | null;
  uom: string | null;
  quantity: number;
};

type Pallet = {
  id: string;
  pallet_code: string;
  status: string;
  created_at: string | null;
  lines: PalletLine[];
};

type StickerJob = {
  itemId: string | null;
  itemNumber: string;
  description: string;
  uom: string;
  copies: number;
};

const typeLabels: Record<DocType, string> = {
  PO: "PO",
  PO_EDI: "PO EDI",
  SPO: "SPO",
  TRANSFER: "TRANSFER",
};

function normalizeDocumentScan(value: string) {
  const v = value.trim();
  if (!v) return "";
  if (v.includes("|")) {
    const parts = v.split("|").map((part) => part.trim()).filter(Boolean);
    const transferIndex = parts.findIndex((part) => part.toUpperCase() === "TRANSFER");
    if (transferIndex >= 0 && parts[transferIndex + 2]) return parts[transferIndex + 2].toUpperCase();
    const doc = parts.find((part) => /^(PO|SPO|SXFR|XFR)/i.test(part));
    if (doc) return doc.toUpperCase();
  }
  return v.toUpperCase();
}

export default function ReceivingPage() {
  const [query, setQuery] = useState("");
  const [activeDocument, setActiveDocument] = useState<ReceivingDocument | null>(null);
  const [pallets, setPallets] = useState<Pallet[]>([]);
  const [activePalletId, setActivePalletId] = useState<string | null>(null);
  const [scanValue, setScanValue] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [notice, setNotice] = useState("Ready to receive.");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showException, setShowException] = useState(false);
  const [exceptionType, setExceptionType] = useState("SHORT");
  const [exceptionNotes, setExceptionNotes] = useState("");
  const [exceptionLineId, setExceptionLineId] = useState<string | null>(null);
  const [stickerJob, setStickerJob] = useState<StickerJob | null>(null);
  const [profileName, setProfileName] = useState("Current Receiver");

  const activePallet = useMemo(
    () => pallets.find((p) => p.id === activePalletId) ?? null,
    [pallets, activePalletId]
  );

  useEffect(() => {
    async function loadProfile() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const { data } = await supabase
        .from("profiles")
        .select("first_name,last_name")
        .eq("id", userData.user.id)
        .maybeSingle();
      if (data) {
        const name = [data.first_name, data.last_name].filter(Boolean).join(" ").trim();
        if (name) setProfileName(name);
      }
    }
    loadProfile();
  }, []);

  useEffect(() => {
    const documentNumber = new URLSearchParams(window.location.search).get("document");
    if (documentNumber) {
      setQuery(documentNumber);
      void findDocument(documentNumber);
    }
  }, []);

  async function loadDocumentById(documentId: string) {
    const { data: doc, error: docError } = await supabase
      .from("receiving_documents")
      .select("id,document_number,document_type,branch_code,branch_id,vendor_code,vendor_name,document_date,buyer,status")
      .eq("id", documentId)
      .single();

    if (docError) throw docError;

    const { data: lines, error: lineError } = await supabase
      .from("receiving_lines")
      .select("id,item_id,item_number,description,bin,uom,ordered_qty,previously_received_qty,received_now_qty,barcode")
      .eq("receiving_document_id", documentId)
      .order("created_at", { ascending: true });

    if (lineError) throw lineError;

    const loaded: ReceivingDocument = {
      ...doc,
      document_type: doc.document_type as DocType,
      lines: (lines ?? []).map((line) => ({
        ...line,
        ordered_qty: Number(line.ordered_qty ?? 0),
        previously_received_qty: Number(line.previously_received_qty ?? 0),
        received_now_qty: Number(line.received_now_qty ?? 0),
      })),
    };

    setActiveDocument(loaded);
    await loadPallets(documentId);
    setNotice(typeLabels[loaded.document_type] + " " + loaded.document_number + " loaded.");
    return loaded;
  }

  async function loadPallets(documentId: string) {
    const { data: palletRows, error: palletError } = await supabase
      .from("pallets")
      .select("id,pallet_code,status,created_at")
      .eq("receiving_document_id", documentId)
      .order("created_at", { ascending: true });

    if (palletError) throw palletError;

    const result: Pallet[] = [];
    for (const pallet of palletRows ?? []) {
      const { data: lines, error: lineError } = await supabase
        .from("pallet_lines")
        .select("id,receiving_line_id,item_id,item_number,description,uom,quantity")
        .eq("pallet_id", pallet.id)
        .order("created_at", { ascending: true });
      if (lineError) throw lineError;
      result.push({
        ...pallet,
        lines: (lines ?? []).map((line) => ({ ...line, quantity: Number(line.quantity ?? 0) })),
      });
    }

    setPallets(result);
    const open = result.find((p) => p.status === "OPEN");
    setActivePalletId(open?.id ?? result[0]?.id ?? null);
  }

  async function findDocument(value?: string) {
    const normalized = normalizeDocumentScan(value ?? query);
    if (!normalized) return;

    setBusy(true);
    setError("");

    try {
      const { data: doc, error: docLookupError } = await supabase
        .from("receiving_documents")
        .select("id")
        .eq("document_number", normalized)
        .maybeSingle();

      if (docLookupError) throw docLookupError;

      if (doc?.id) {
        await loadDocumentById(doc.id);
        return;
      }

      if (normalized.startsWith("SXFR") || normalized.startsWith("XFR")) {
        const { data: transfer, error: transferError } = await supabase
          .from("transfers")
          .select("id,transfer_number")
          .eq("transfer_number", normalized)
          .maybeSingle();

        if (transferError) throw transferError;

        if (transfer?.id) {
          const { data: bridgeId, error: bridgeError } = await supabase.rpc(
            "ensure_transfer_receiving_document",
            { p_transfer_id: transfer.id }
          );
          if (bridgeError) throw bridgeError;
          await loadDocumentById(bridgeId as string);
          setNotice("Transfer " + normalized + " opened for destination receiving.");
          return;
        }

        const { data: assignment, error: assignmentError } = await supabase
          .from("transfer_assignments")
          .select("transfer_id,ticket_code")
          .eq("ticket_code", normalized)
          .maybeSingle();

        if (assignmentError) throw assignmentError;

        if (assignment?.transfer_id) {
          const { data: bridgeId, error: bridgeError } = await supabase.rpc(
            "ensure_transfer_receiving_document",
            { p_transfer_id: assignment.transfer_id }
          );
          if (bridgeError) throw bridgeError;
          await loadDocumentById(bridgeId as string);
          setNotice("Personal transfer ticket " + normalized + " opened for receiving.");
          return;
        }
      }

      setActiveDocument(null);
      setPallets([]);
      setActivePalletId(null);
      setNotice("No receiving document found for " + normalized + ".");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load receiving document.");
    } finally {
      setBusy(false);
    }
  }

  async function createPallet() {
    if (!activeDocument) return;
    setBusy(true);
    setError("");
    try {
      const { data, error: rpcError } = await supabase.rpc("create_receiving_pallet", {
        p_receiving_document_id: activeDocument.id,
      });
      if (rpcError) throw rpcError;
      const created = Array.isArray(data) ? data[0] : data;
      await loadPallets(activeDocument.id);
      if (created?.id) setActivePalletId(created.id);
      await loadDocumentById(activeDocument.id);
      setNotice("New pallet created and linked to " + activeDocument.document_number + ".");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create pallet.");
    } finally {
      setBusy(false);
    }
  }

  async function addItemToPallet() {
    if (!activeDocument || !activePallet) {
      setError("Open a document and create/select an OPEN pallet first.");
      return;
    }
    if (activePallet.status !== "OPEN") {
      setError("This pallet is not open for receiving.");
      return;
    }

    const scanned = scanValue.trim().toUpperCase();
    if (!scanned) return;

    const line = activeDocument.lines.find(
      (item) =>
        item.item_number.toUpperCase() === scanned ||
        item.barcode?.toUpperCase() === scanned
    );

    if (!line) {
      setExceptionType("UNKNOWN_BARCODE");
      setExceptionNotes("Scanned value: " + scanValue);
      setExceptionLineId(null);
      setShowException(true);
      return;
    }

    setBusy(true);
    setError("");
    try {
      const { error: rpcError } = await supabase.rpc("receive_item_to_pallet", {
        p_pallet_id: activePallet.id,
        p_receiving_line_id: line.id,
        p_quantity: quantity,
      });
      if (rpcError) {
        if (rpcError.message.toLowerCase().includes("over receipt")) {
          setExceptionType("OVER");
          setExceptionLineId(line.id);
          setExceptionNotes(rpcError.message);
          setShowException(true);
          return;
        }
        throw rpcError;
      }

      await loadDocumentById(activeDocument.id);
      setScanValue("");
      setQuantity(1);
      setNotice(quantity + " " + (line.uom ?? "EA") + " received for item " + line.item_number + ".");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not receive item.");
    } finally {
      setBusy(false);
    }
  }

  async function submitException() {
    if (!activeDocument) return;
    const line = exceptionLineId
      ? activeDocument.lines.find((l) => l.id === exceptionLineId)
      : null;

    setBusy(true);
    setError("");
    try {
      const { data: userData } = await supabase.auth.getUser();

      const { error: insertError } = await supabase
        .from("receiving_exceptions")
        .insert({
          receiving_document_id: activeDocument.id,
          pallet_id: activePallet?.id ?? null,
          exception_type: exceptionType,
          item_number: line?.item_number ?? null,
          item_id: line?.item_id ?? null,
          expected_qty: line
            ? Number(line.ordered_qty) - Number(line.previously_received_qty)
            : null,
          actual_qty: line ? Number(line.received_now_qty) : null,
          notes: exceptionNotes || null,
          status: "OPEN",
          reported_by: profileName,
          reported_by_user_id: userData.user?.id ?? null,
        });

      if (insertError) throw insertError;

      await fetch("/api/receiving/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentNumber: activeDocument.document_number,
          branch: activeDocument.branch_code,
          palletCode: activePallet?.pallet_code ?? null,
          exceptionType,
          itemNumber: line?.item_number ?? null,
          notes: exceptionNotes,
        }),
      });

      setShowException(false);
      setExceptionNotes("");
      setExceptionLineId(null);
      setNotice("Exception recorded and routed to receiving leadership.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not record exception.");
    } finally {
      setBusy(false);
    }
  }

  async function closePallet() {
    if (!activePallet || !activeDocument) return;
    setBusy(true);
    setError("");
    try {
      const { error: rpcError } = await supabase.rpc("close_receiving_pallet", {
        p_pallet_id: activePallet.id,
      });
      if (rpcError) throw rpcError;
      await loadDocumentById(activeDocument.id);
      setNotice(activePallet.pallet_code + " closed and released to Putaway.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not close pallet.");
    } finally {
      setBusy(false);
    }
  }

  async function printSticker(job: StickerJob) {
    setStickerJob(job);
    if (job.itemId) {
      const { data: userData } = await supabase.auth.getUser();
      await supabase.from("label_prints").insert({
        pallet_id: activePallet?.id ?? null,
        item_id: job.itemId,
        label_type: "ITEM",
        copies: job.copies,
        printed_by: userData.user?.id ?? null,
      });
    }
    setTimeout(() => window.print(), 100);
  }

  const totalOnPallet =
    activePallet?.lines.reduce((sum, item) => sum + Number(item.quantity), 0) ?? 0;

  return (
    <main className="shell">
      <WmsSidebar />

      <section className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">INBOUND OPERATIONS</p>
            <h1>Receiving</h1>
            <p className="muted">
              Live PO, EDI, SPO, transfer, pallet, exception, label, and putaway workflow.
            </p>
          </div>
          <button className="iconButton" title="Notifications"><Bell size={20} /></button>
        </header>

        <div className="notice">{notice}</div>
        {error ? <div className="notice dangerNotice">{error}</div> : null}

        <section className="card scanCard">
          <div className="sectionTitle">
            <div>
              <h2>Start Receiving</h2>
              <p>Scan or enter a PO, EDI PO, SPO, transfer number, or transfer-ticket QR.</p>
            </div>
          </div>

          <div className="searchRow">
            <div className="searchInput">
              <Search size={20} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && findDocument()}
                placeholder="PO / SPO / SXFR / transfer-ticket QR"
                autoFocus
              />
            </div>
            <button className="primary" onClick={() => findDocument()} disabled={busy}>
              {busy ? "Working..." : "Open"}
            </button>
          </div>

          <div className="typeGrid">
            <div className="typeCard"><FileText /><strong>PO</strong><small>Vendor purchase order</small></div>
            <div className="typeCard"><FileText /><strong>PO EDI</strong><small>Electronic purchase order</small></div>
            <div className="typeCard"><PackageCheck /><strong>SPO</strong><small>Special purchase order</small></div>
            <div className="typeCard"><Send /><strong>TRANSFER</strong><small>Branch-to-branch transfer</small></div>
          </div>
        </section>

        {activeDocument ? (
          <>
            <section className="card">
              <div className="documentHeader">
                <div>
                  <p className="eyebrow">RECEIVING DOCUMENT</p>
                  <h2>{activeDocument.document_number}</h2>
                </div>
                <span className="status green">{activeDocument.status}</span>
              </div>

              <div className="metadataGrid">
                <div><small>TYPE</small><strong>{typeLabels[activeDocument.document_type]}</strong></div>
                <div><small>BRANCH</small><strong>{activeDocument.branch_code}</strong></div>
                <div><small>VENDOR / FROM</small><strong>{activeDocument.vendor_code ?? "—"} {activeDocument.vendor_name ? "- " + activeDocument.vendor_name : ""}</strong></div>
                <div><small>DOCUMENT DATE</small><strong>{activeDocument.document_date ?? "—"}</strong></div>
                <div><small>RECEIVER</small><strong>{profileName}</strong></div>
              </div>

              <div className="tableWrap">
                <table>
                  <thead>
                    <tr>
                      <th>Item #</th><th>Description</th><th>Source Bin</th><th>UOM</th>
                      <th>Ordered</th><th>Prev Rec</th><th>Now</th><th>Remaining</th><th>Sticker</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeDocument.lines.length ? activeDocument.lines.map((line) => {
                      const remaining = Math.max(
                        0,
                        Number(line.ordered_qty) -
                          Number(line.previously_received_qty) -
                          Number(line.received_now_qty)
                      );
                      return (
                        <tr key={line.id}>
                          <td><strong>{line.item_number}</strong></td>
                          <td>{line.description ?? "—"}</td>
                          <td>{line.bin ?? "—"}</td>
                          <td>{line.uom ?? "EA"}</td>
                          <td>{line.ordered_qty}</td>
                          <td>{line.previously_received_qty}</td>
                          <td>{line.received_now_qty}</td>
                          <td>{remaining}</td>
                          <td>
                            <button
                              className="miniButton"
                              disabled={Number(line.received_now_qty) <= 0}
                              onClick={() => printSticker({
                                itemId: line.item_id,
                                itemNumber: line.item_number,
                                description: line.description ?? "",
                                uom: line.uom ?? "EA",
                                copies: Math.min(250, Math.max(1, Math.floor(Number(line.received_now_qty)))),
                              })}
                            >
                              <Sticker size={15}/> Print
                            </button>
                          </td>
                        </tr>
                      );
                    }) : (
                      <tr><td colSpan={9} className="empty">No lines on this document.</td></tr>
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
                    <p>Create a receiving pallet or choose an existing open pallet.</p>
                  </div>
                  <button className="secondary" onClick={createPallet} disabled={busy}>
                    + New Pallet
                  </button>
                </div>

                {pallets.length ? (
                  <div className="palletSelector">
                    {pallets.map((pallet) => (
                      <button
                        key={pallet.id}
                        className={"palletChoice" + (pallet.id === activePalletId ? " selected" : "")}
                        onClick={() => setActivePalletId(pallet.id)}
                      >
                        <strong>{pallet.pallet_code}</strong>
                        <span>{pallet.status.replaceAll("_", " ")}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="emptyState">No pallets yet. Create one to start scanning items.</div>
                )}

                {activePallet ? (
                  <div className="palletSummary">
                    <div>
                      <small>ACTIVE PALLET</small>
                      <h3>{activePallet.pallet_code}</h3>
                      <span className={activePallet.status === "OPEN" ? "status amber" : "status green"}>
                        {activePallet.status.replaceAll("_", " ")}
                      </span>
                    </div>
                    <div className="bigNumber">
                      <strong>{totalOnPallet}</strong>
                      <span>Total Units</span>
                    </div>
                  </div>
                ) : null}

                <div className="scanItem">
                  <label>Scan Item QR / Barcode</label>
                  <input
                    value={scanValue}
                    onChange={(e) => setScanValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addItemToPallet()}
                    placeholder="Scan item barcode or item number"
                  />
                  <div className="quantityRow">
                    <div>
                      <label>Quantity</label>
                      <input
                        type="number"
                        min={1}
                        step="1"
                        value={quantity}
                        onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                      />
                    </div>
                    <button className="success" onClick={addItemToPallet} disabled={busy || !activePallet || activePallet.status !== "OPEN"}>
                      Add to Pallet
                    </button>
                  </div>
                </div>
              </section>

              <section className="card">
                <div className="sectionTitle">
                  <div>
                    <h2>Pallet Contents & Item Stickers</h2>
                    <p>Verified contents persist in Supabase and can print scannable item labels.</p>
                  </div>
                  <QrCode size={28} />
                </div>

                {activePallet?.lines.length ? (
                  <div className="palletLines">
                    {activePallet.lines.map((line) => (
                      <div className="palletLine" key={line.id}>
                        <div>
                          <strong>{line.item_number}</strong>
                          <p>{line.description ?? "No description"}</p>
                          <button
                            className="miniButton"
                            onClick={() => printSticker({
                              itemId: line.item_id,
                              itemNumber: line.item_number,
                              description: line.description ?? "",
                              uom: line.uom ?? "EA",
                              copies: Math.min(250, Math.max(1, Math.floor(Number(line.quantity)))),
                            })}
                          >
                            <Sticker size={14}/> Print {Math.min(250, Math.max(1, Math.floor(Number(line.quantity))))} sticker(s)
                          </button>
                        </div>
                        <span>{line.quantity} {line.uom ?? "EA"}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="emptyState">Scan items to build this pallet.</div>
                )}

                <div className="actionGrid">
                  <button className="secondary" onClick={() => { setStickerJob(null); setTimeout(() => window.print(), 50); }}><Printer size={17}/> Print Receiving View</button>
                  <button className="dangerOutline" onClick={() => setShowException(true)}><AlertTriangle size={17}/> Report Problem</button>
                  <button
                    className="primary"
                    onClick={closePallet}
                    disabled={busy || !activePallet || activePallet.status !== "OPEN" || !activePallet.lines.length}
                  >
                    <CheckCircle2 size={17}/> Close & Send to Putaway
                  </button>
                </div>
              </section>
            </div>
          </>
        ) : (
          <section className="card">
            <div className="emptyState">Scan a live inbound document to begin receiving.</div>
          </section>
        )}

        {showException ? (
          <div className="modalBackdrop">
            <div className="modal">
              <div className="modalHeader">
                <div>
                  <p className="eyebrow dangerText">RECEIVING EXCEPTION</p>
                  <h2>Report Receiving Problem</h2>
                </div>
                <button className="iconButton" onClick={() => setShowException(false)}>×</button>
              </div>

              <label>Exception Type</label>
              <select value={exceptionType} onChange={(e) => setExceptionType(e.target.value)}>
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
                placeholder="Describe what was found during receiving."
              />

              <div className="modalActions">
                <button className="secondary" onClick={() => setShowException(false)}>Cancel</button>
                <button className="danger" onClick={submitException} disabled={busy}>
                  <Bell size={17}/> Save & Notify Leadership
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {stickerJob ? (
          <div className="printOnly labelPrintSheet">
            {Array.from({ length: stickerJob.copies }).map((_, index) => (
              <div className="itemSticker" key={index}>
                <div className="itemStickerQr">
                  <QRCodeSVG
                    value={"WMS|ITEM|" + stickerJob.itemNumber + "|BRANCH|" + (activeDocument?.branch_code ?? "")}
                    size={86}
                    level="M"
                  />
                </div>
                <div className="itemStickerText">
                  <strong>{stickerJob.itemNumber}</strong>
                  <span>{stickerJob.description}</span>
                  <small>{activeDocument?.branch_code} · {activeDocument?.document_number}</small>
                  <small>{activePallet?.pallet_code ?? "No pallet"} · {stickerJob.uom}</small>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </section>
    </main>
  );
}
