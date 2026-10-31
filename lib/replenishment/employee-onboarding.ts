import type { DriverCoverage } from "./aisle-routing";
import type { DriverTask } from "./driver-tasks";

export type EmployeeRole = "lift_driver" | "cycle_counter" | "inventory_specialist" | "receiving" | "other";
export type EmployeeRecord = {
  employeeId:string; name:string; branch:string; role:EmployeeRole;
  startDate:string; active:boolean; liftCertified:boolean;
};
export const ELIGIBLE_DRIVER_ROLES:EmployeeRole[]=["lift_driver"];
const validDate=(date:string)=>/^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date+"T00:00:00Z"));
export function onboardDriver(
  employee:EmployeeRecord, roster:DriverCoverage[], employees:EmployeeRecord[], today:string
):{roster:DriverCoverage[];employees:EmployeeRecord[];message:string}{
 const id=employee.employeeId.trim(),name=employee.name.trim();
 if(!id||!name||!employee.branch.trim()||!validDate(employee.startDate)||!validDate(today))
  return {roster,employees,message:"Complete employee ID, name, branch and valid start date."};
 if(employees.some(e=>e.employeeId===id))return {roster,employees,message:"Employee ID already exists."};
 const nextEmployees=[...employees,{...employee,employeeId:id,name}];
 if(!employee.active||!ELIGIBLE_DRIVER_ROLES.includes(employee.role))
  return {roster,employees:nextEmployees,message:"Employee recorded; no lift-driver assignment for this role/status."};
 if(!employee.liftCertified)
  return {roster,employees:nextEmployees,message:"Employee recorded; lift certification required before dispatch eligibility."};
 if(employee.startDate>today)
  return {roster,employees:nextEmployees,message:"Employee recorded; driver assignment begins on start date."};
 if(roster.some(r=>r.name.toLowerCase()===name.toLowerCase()))
  return {roster,employees:nextEmployees,message:"Employee recorded; matching driver name needs supervisor review."};
 const load=new Map<string,number>();
 for(const row of roster)for(const aisle of row.aisles)load.set(aisle,(load.get(aisle)||0)+1);
 const aisles="ABCDEFGHIJKL".split("");
 const min=Math.min(...aisles.map(a=>load.get(a)||0));
 const leastCovered=aisles.filter(a=>(load.get(a)||0)===min);
 const chosen=leastCovered[0];
 return {roster:[...roster,{name,aisles:[chosen],attendance:"AVAILABLE"}],employees:nextEmployees,message:"Driver onboarded and assigned aisle "+chosen+" (editable by supervisor)."};
}
export function routeEligible(task:DriverTask,employee:EmployeeRecord|undefined, today:string):boolean{
 return !!employee && employee.active && employee.liftCertified &&
 employee.role==="lift_driver" && employee.startDate<=today && employee.branch.toUpperCase()===task.branch.toUpperCase();
}
