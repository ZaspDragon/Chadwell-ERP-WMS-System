/**
 * Driver dispatch state machine for the CHADWMS restock simulation.
 * Production must persist tasks, enforce unique active task keys and authorize
 * branch-scoped transitions server-side before any inventory movement.
 */
export type DriverTaskStatus = "OPEN" | "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "EXCEPTION";
export type DriverTask = {
  id: string; key: string; branch: string; itemNumber: string;
  primaryBin: string; sourceBin: string; requestedQty: number;
  priority: "BLOCKING" | "URGENT" | "LOW";
  status: DriverTaskStatus; driver: string | null;
  actualQty: number | null; note: string; createdAt: string;
};
export const DRIVERS = ["Haven", "Dawitt", "Kristopher", "Dury", "Diamond"] as const;
export function createDriverTask(
  task: Omit<DriverTask, "status" | "driver" | "actualQty" | "note" | "createdAt">,
  existing: DriverTask[],
  createdAt: string
): DriverTask[] {
  if (!task.sourceBin.trim() || task.sourceBin.trim().toUpperCase() === task.primaryBin.trim().toUpperCase() ||
      !Number.isSafeInteger(task.requestedQty) || task.requestedQty <= 0) return existing;
  if (existing.some(t => t.key === task.key && t.status !== "COMPLETED" && t.status !== "EXCEPTION")) return existing;
  return [...existing, {...task,sourceBin:task.sourceBin.trim().toUpperCase(),status:"OPEN",driver:null,actualQty:null,note:"",createdAt}];
}
export function assignDriver(tasks: DriverTask[], id: string, driver: string): DriverTask[] {
  if (!DRIVERS.some(d => d === driver)) return tasks;
  return tasks.map(t => t.id === id && t.status === "OPEN" ? {...t,status:"ASSIGNED",driver} : t);
}
export function beginTask(tasks: DriverTask[], id: string): DriverTask[] {
  return tasks.map(t => t.id === id && t.status === "ASSIGNED" ? {...t,status:"IN_PROGRESS"} : t);
}
export function finishTask(
  tasks: DriverTask[], id: string, scannedSource: string,
  scannedDestination: string, scannedItem: string, actualQty: number
): {tasks:DriverTask[];error:string} {
  const task=tasks.find(t=>t.id===id);
  if (!task || task.status !== "IN_PROGRESS") return {tasks,error:"Task must be in progress."};
  if (scannedSource.trim().toUpperCase() !== task.sourceBin ||
      scannedDestination.trim().toUpperCase() !== task.primaryBin ||
      scannedItem.trim().toUpperCase() !== task.itemNumber.toUpperCase()) return {tasks,error:"Source, primary or item scan does not match the task."};
  if (!Number.isSafeInteger(actualQty) || actualQty !== task.requestedQty) return {tasks,error:"Quantity differs from request. Record an exception for supervisor review."};
  return {tasks:tasks.map(t=>t.id===id?{...t,status:"COMPLETED",actualQty}:t),error:""};
}
export function exceptionTask(tasks:DriverTask[],id:string,note:string):DriverTask[]{
  if (!note.trim()) return tasks;
  return tasks.map(t=>t.id===id && ["ASSIGNED","IN_PROGRESS"].includes(t.status)?{...t,status:"EXCEPTION",note:note.trim()}:t);
}
