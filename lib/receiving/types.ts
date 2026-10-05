export type ReceivingDocumentType = "PO" | "PO_EDI" | "SPO" | "TRANSFER";
export type ReceivingStatus =
  | "OPEN"
  | "RECEIVING"
  | "RECEIVED"
  | "STAGED"
  | "PUTAWAY"
  | "CLOSED"
  | "EXCEPTION";

export type ReceivingLine = {
  id: string;
  itemNumber: string;
  description: string;
  bin: string;
  uom: string;
  orderedQty: number;
  previouslyReceivedQty: number;
  receivedNowQty: number;
  barcode?: string;
};

export type ReceivingDocument = {
  id: string;
  documentNumber: string;
  type: ReceivingDocumentType;
  branch: string;
  vendorCode: string;
  vendorName: string;
  documentDate: string;
  buyer?: string;
  status: ReceivingStatus;
  lines: ReceivingLine[];
};

export type PalletLine = {
  lineId: string;
  itemNumber: string;
  description: string;
  uom: string;
  quantity: number;
};

export type ReceivingPallet = {
  id: string;
  documentNumber: string;
  branch: string;
  status: "OPEN" | "READY_FOR_PUTAWAY" | "PUTAWAY_COMPLETE" | "HOLD";
  createdAt: string;
  createdBy: string;
  lines: PalletLine[];
};

export type ReceivingExceptionType =
  | "SHORT"
  | "OVER"
  | "DAMAGED"
  | "WRONG_ITEM"
  | "UNKNOWN_BARCODE"
  | "DOCUMENT_MISMATCH"
  | "HOLD";
