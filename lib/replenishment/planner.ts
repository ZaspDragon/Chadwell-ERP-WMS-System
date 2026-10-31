/**
 * Pure, side-effect-free replenishment planner.
 * A server-side job must supply authorized, transactionally consistent snapshots
 * and persist requests with unique keys before notifying lift drivers.
 */
export type PrimaryDemand = {
  branch: string;
  itemNumber: string;
  primaryBin: string;
  primaryAvailable: number;
  unprintedOrderDemand: number;
  minPrimary: number;
  targetPrimary: number;
  overstockAvailable: number;
  alreadyRequested: number;
};
export type ReplenishmentSuggestion = {
  key: string;
  branch: string;
  itemNumber: string;
  primaryBin: string;
  suggestedQty: number;
  uncoveredDemand: number;
  priority: "BLOCKING" | "URGENT" | "LOW";
  reason: string;
};
const valid = (n: number) => Number.isSafeInteger(n) && n >= 0;
export function planPrimaryReplenishment(rows: PrimaryDemand[]): ReplenishmentSuggestion[] {
  return rows.flatMap(row => {
    const { branch, itemNumber, primaryBin } = row;
    if (![row.primaryAvailable,row.unprintedOrderDemand,row.minPrimary,row.targetPrimary,row.overstockAvailable,row.alreadyRequested].every(valid)) return [];
    if (!branch.trim() || !itemNumber.trim() || !primaryBin.trim()) return [];
    const availableAfterReservations = Math.max(0, row.primaryAvailable - row.alreadyRequested);
    const uncoveredDemand = Math.max(0, row.unprintedOrderDemand - row.primaryAvailable);
    const shouldRequest = row.unprintedOrderDemand > 0 &&
      (row.primaryAvailable < row.minPrimary || row.primaryAvailable < row.unprintedOrderDemand);
    if (!shouldRequest) return [];
    const needed = Math.max(row.targetPrimary, row.unprintedOrderDemand) - row.primaryAvailable - row.alreadyRequested;
    const suggestedQty = Math.min(row.overstockAvailable, Math.max(0, needed));
    if (suggestedQty === 0) return [];
    const priority = uncoveredDemand > 0 ? "BLOCKING" : availableAfterReservations < row.minPrimary ? "URGENT" : "LOW";
    return [{
      key: [branch,itemNumber,primaryBin].map(s=>s.trim().toUpperCase()).join(":"),
      branch:branch.trim().toUpperCase(), itemNumber:itemNumber.trim().toUpperCase(),
      primaryBin:primaryBin.trim().toUpperCase(),suggestedQty,uncoveredDemand,
      priority,
      reason: uncoveredDemand > 0 ? "Unprinted orders exceed available primary stock" : "Primary is below minimum with unprinted demand",
    }];
  }).sort((a,b)=>({BLOCKING:0,URGENT:1,LOW:2}[a.priority]-{BLOCKING:0,URGENT:1,LOW:2}[b.priority]) || b.uncoveredDemand-a.uncoveredDemand);
}
