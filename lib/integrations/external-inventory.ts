export type ExternalStock={source:string;warehouse:string;bin:string;item:string;onHand:number;allocated:number;onHold:number;description:string};
export type ImportIssue={line:number;reason:string};
export type ImportPreview={rows:ExternalStock[];issues:ImportIssue[];warehouses:string[];duplicateKeys:string[]};
export function parseCsv(input:string):string[][]{
 const rows:string[][]=[];let row:string[]=[],cell="",quoted=false;
 for(let i=0;i<input.length;i++){const ch=input[i];
  if(ch==='"'){if(quoted&&input[i+1]==='"'){cell+='"';i++}else quoted=!quoted}
  else if(ch===","&&!quoted){row.push(cell);cell=""}
  else if((ch==="\n"||ch==="\r")&&!quoted){if(ch==="\r"&&input[i+1]==="\n")i++;row.push(cell);if(row.some(x=>x.trim()))rows.push(row);row=[];cell=""}
  else cell+=ch;
 }
 if(quoted)throw new Error("Unclosed CSV quotation.");
 row.push(cell);if(row.some(x=>x.trim()))rows.push(row);
 return rows;
}
const normalized=(s:string)=>s.trim().toUpperCase();
const integer=(s:string)=>{const n=Number(s.trim());return s.trim()!==""&&Number.isSafeInteger(n)&&n>=0?n:null};
export function previewStockImport(text:string,source:string):ImportPreview{
 const data=parseCsv(text.replace(/^\uFEFF/,""));const headers=(data[0]||[]).map(s=>s.trim().toLowerCase().replace(/[\s-]+/g,"_"));
 const names=["warehouse","bin","item","on_hand"];const missing=names.filter(x=>!headers.includes(x));
 if(missing.length)throw new Error("Missing required CSV columns: "+missing.join(", "));
 const get=(row:string[],key:string)=>row[headers.indexOf(key)]||"";
 const rows:ExternalStock[]=[],issues:ImportIssue[]=[];const seen=new Set<string>(),duplicates=new Set<string>();
 for(let i=1;i<data.length;i++){const row=data[i],warehouse=normalized(get(row,"warehouse")),bin=normalized(get(row,"bin")),item=normalized(get(row,"item"));
 const onHand=integer(get(row,"on_hand")),allocated=headers.includes("allocated")?integer(get(row,"allocated")):0,onHold=headers.includes("on_hold")?integer(get(row,"on_hold")):0;
 if(!warehouse||!bin||!/^\d{6}$/.test(item)||onHand===null||allocated===null||onHold===null){issues.push({line:i+1,reason:"Missing warehouse/bin, item must be exactly 6 digits, or invalid nonnegative whole-number quantity"});continue}
 const key=[warehouse,bin,item].join("|");if(seen.has(key)){duplicates.add(key);issues.push({line:i+1,reason:"Duplicate warehouse/bin/item key"});continue}seen.add(key);
 rows.push({source,warehouse,bin,item,onHand,allocated,onHold,description:get(row,"description").trim()});
 }
 return {rows,issues,warehouses:[...new Set(rows.map(r=>r.warehouse))].sort(),duplicateKeys:[...duplicates]};
}
export function filterStock(rows:ExternalStock[],warehouse:string,search:string){
 const q=search.trim().toLowerCase();return rows.filter(r=>(warehouse==="ALL"||r.warehouse===warehouse)&&[r.bin,r.item,r.description].some(s=>s.toLowerCase().includes(q)));
}
