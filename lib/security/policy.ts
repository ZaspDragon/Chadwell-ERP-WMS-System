/** CHADWMS policy definitions. This is NOT a substitute for server authorization or RLS. */
export const ROLE_TIERS = {
  associate: 1, coordinator: 1, stocker: 1, picker: 1,
  specialist: 2, lead: 3, supervisor: 4,
  department_manager: 5, branch_manager: 6, director: 7,
} as const;
export type Role = keyof typeof ROLE_TIERS;
export type Department = "inventory" | "receiving" | "fulfillment" | "transfers" | "management";
export type Capability = "inventory.read" | "inventory.move" | "inventory.adjust.request" |
 "inventory.adjust.approve" | "inventory.count" | "receiving.receive" |
 "fulfillment.pick" | "transfers.dispatch" | "transfers.receive" |
 "reports.department" | "reports.branch" | "reports.regional";
export type Assignment = {role:Role;department:Department;branchCodes:readonly string[];active:boolean};
export type AccessRequest = {capability:Capability;department:Department;branchCode:string};
const minimum:Record<Capability,number>={
 "inventory.read":1,"inventory.move":1,"inventory.adjust.request":2,
 "inventory.adjust.approve":4,"inventory.count":1,
 "receiving.receive":1,"fulfillment.pick":1,"transfers.dispatch":1,
 "transfers.receive":1,"reports.department":3,"reports.branch":6,"reports.regional":7
};
export function canAccess(assignments:readonly Assignment[],request:AccessRequest):boolean {
 const branch=request.branchCode.trim().toUpperCase();
 if(!branch)return false;
 return assignments.some(a=>{
  if(!a.active||!(a.role in ROLE_TIERS))return false;
  const tier=ROLE_TIERS[a.role];
  if(tier<minimum[request.capability])return false;
  if(!a.branchCodes.some(b=>b.toUpperCase()===branch))return false;
  if(tier>=6)return true;
  return a.department===request.department;
 });
}
export function canApproveOwnRequest(approverId:string,requesterId:string):boolean{
 return Boolean(approverId&&requesterId&&approverId!==requesterId);
}
