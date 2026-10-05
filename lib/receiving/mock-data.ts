import type { ReceivingDocument } from "./types";

export const demoDocuments: ReceivingDocument[] = [
  {
    id: "demo-po-905978",
    documentNumber: "PO0000905978",
    type: "PO",
    branch: "OHC",
    vendorCode: "45045",
    vendorName: "AMAZON",
    documentDate: "2026-01-27",
    buyer: "Michelle Twiner",
    status: "OPEN",
    lines: [
      {
        id: "line-1",
        itemNumber: "ZZ-B014BZ5SN8",
        description: "RAB LIGHTING LED PORTO 55W COOL GARAGE LIGHT BRONZE - PRT55",
        bin: "OHC",
        uom: "Each",
        orderedQty: 8,
        previouslyReceivedQty: 0,
        receivedNowQty: 0,
        barcode: "ZZ-B014BZ5SN8",
      },
    ],
  },
  {
    id: "demo-edi-1",
    documentNumber: "POEDI00010384",
    type: "PO_EDI",
    branch: "OH01",
    vendorCode: "EDI-100",
    vendorName: "EDI VENDOR",
    documentDate: "2026-10-05",
    status: "OPEN",
    lines: [],
  },
  {
    id: "demo-spo-1",
    documentNumber: "SPO125789",
    type: "SPO",
    branch: "OH01",
    vendorCode: "SPO",
    vendorName: "SPECIAL ORDER",
    documentDate: "2026-10-05",
    status: "OPEN",
    lines: [],
  },
  {
    id: "demo-transfer-1",
    documentNumber: "SXFR0222629",
    type: "TRANSFER",
    branch: "OH01",
    vendorCode: "OHC",
    vendorName: "OHC → OH01",
    documentDate: "2026-10-05",
    status: "OPEN",
    lines: [],
  },
];

export function detectDocumentType(value: string) {
  const v = value.trim().toUpperCase();
  if (v.startsWith("SPO")) return "SPO";
  if (v.startsWith("SXFR") || v.startsWith("XFR")) return "TRANSFER";
  if (v.includes("EDI")) return "PO_EDI";
  return "PO";
}
