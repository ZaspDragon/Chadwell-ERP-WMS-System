import type { DriverTask } from "./driver-tasks";

export type Attendance = "AVAILABLE" | "CALLED_OFF" | "BUSY";
export type DriverCoverage = { name:string; aisles:string[]; attendance:Attendance };
export const DEFAULT_COVERAGE:DriverCoverage[] = [
 {name:"Dawitt",aisles:["A"],attendance:"AVAILABLE"},
 {name:"Kristopher",aisles:["B"],attendance:"AVAILABLE"},
 {name:"Haven",aisles:["D"],attendance:"AVAILABLE"},
 {name:"Dury",aisles:["E"],attendance:"AVAILABLE"},
 {name:"Diamond",aisles:[],attendance:"AVAILABLE"},
];
export function aisleFromBin(bin:string):string {
 const normalized=bin.trim().toUpperCase();
 const match=normalized.match(/^([A-L])(?:[-\s\d]|$)/);
 return match?.[1] ?? "";
}
export function recommendDriver(task:DriverTask,coverage:DriverCoverage[],tasks:DriverTask[]):{driver:string|null;reason:string}{
 const aisle=aisleFromBin(task.primaryBin);
 if(!aisle)return {driver:null,reason:"Unknown destination aisle: supervisor assignment required."};
 const available=coverage.filter(c=>c.attendance==="AVAILABLE");
 if(!available.length)return {driver:null,reason:"No available drivers."};
 const load=(name:string)=>tasks.filter(t=>t.driver===name && ["ASSIGNED","IN_PROGRESS"].includes(t.status)).length;
 const owners=available.filter(c=>c.aisles.includes(aisle));
 const candidates=owners.length?owners:available;
 const sorted=[...candidates].sort((a,b)=>load(a.name)-load(b.name)||a.name.localeCompare(b.name));
 return {driver:sorted[0].name,reason:owners.length?"Assigned aisle owner":"Cross-aisle coverage: owner unavailable or unassigned"};
}
export function validateCoverage(rows:DriverCoverage[]):boolean{
 return rows.length>0 &&
 new Set(rows.map(r=>r.name)).size===DRIVERS.length &&
 rows.every(r=>!!r.name.trim()&&r.aisles.every(a=>/^[A-L]$/.test(a)));
}
