export type ReviewRole="LEAD"|"SUPERVISOR"|"MANAGER";
export type LocationCheck={location:string;kind:"COUNTED"|"PRIMARY"|"OVERSTOCK"|"OTHER";checked:boolean;note:string};
export type Discrepancy={id:string;branch:string;itemNumber:string;countedLocation:string;expected:number;counted:number;status:"OPEN"|"ACCEPTED"|"RECOUNT_REQUIRED"|"READY_FOR_REVIEW"|"CLOSED";acceptedBy:string|null;acceptedRole:ReviewRole|null;checks:LocationCheck[]};
export type InventoryLocation={branch:string;itemNumber:string;location:string;kind:LocationCheck["kind"]};
const order:Record<LocationCheck["kind"],number>={COUNTED:0,PRIMARY:1,OVERSTOCK:2,OTHER:3};
function aisle(loc:string){return loc.trim().toUpperCase().match(/^([A-L])(?:[-\d\s]|$)/)?.[1]||"Z"}
export function orderedChecks(branch:string,itemNumber:string,countedLocation:string,locations:InventoryLocation[]):LocationCheck[]{
 const seen=new Set<string>();const all=[{location:countedLocation,kind:"COUNTED" as const},...locations.filter(l=>l.branch===branch&&l.itemNumber===itemNumber).map(l=>({location:l.location,kind:l.kind}))];
 return all.filter(l=>{const k=l.location.trim().toUpperCase();if(!k||seen.has(k))return false;seen.add(k);return true}).map(l=>({...l,location:l.location.trim().toUpperCase(),checked:false,note:""}))
 .sort((a,b)=>order[a.kind]-order[b.kind]||aisle(a.location).localeCompare(aisle(b.location))||a.location.localeCompare(b.location,undefined,{numeric:true}));
}
export function acceptDiscrepancy(rows:Discrepancy[],id:string,user:string,role:ReviewRole):Discrepancy[]{
 if(!user.trim())return rows;
 return rows.map(r=>r.id===id&&r.status==="OPEN"?{...r,status:"ACCEPTED",acceptedBy:user.trim(),acceptedRole:role}:r);
}
export function recordCheck(rows:Discrepancy[],id:string,user:string,location:string,note:string):Discrepancy[]{
 return rows.map(r=>r.id===id&&r.status==="ACCEPTED"&&r.acceptedBy===user?{...r,checks:r.checks.map(c=>c.location===location?{...c,checked:true,note:note.trim()}:c)}:r);
}
export function submitInvestigation(rows:Discrepancy[],id:string,user:string):Discrepancy[]{
 return rows.map(r=>r.id===id&&r.status==="ACCEPTED"&&r.acceptedBy===user&&r.checks.length>0&&r.checks.every(c=>c.checked)?{...r,status:"READY_FOR_REVIEW"}:r);
}
