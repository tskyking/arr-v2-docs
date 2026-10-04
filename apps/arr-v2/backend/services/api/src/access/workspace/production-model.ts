import {definitionAnswers,type ProductionDefinition} from './production-forms.js';
/** Generic fictional production demo. Intentionally separate from historical forms. */
import { check, text } from './model.js';
export const productionConfig = {
  timezone: 'America/Los_Angeles',
  shifts: [{id:'day',label:'Day',start:'05:00',end:'15:30'}, {id:'swing',label:'Swing',start:'15:00',end:'02:00'}],
  stages: ['Receiving and Sorting','Cleaning / Decontamination','Inspection','Functional Testing','Repair / Reassembly','Final Quality Review','Packaging'],
  products: ['EP catheters','Electrosurgical devices','Ultrasonic devices','Ablation devices','ECG products','Pulse-oximetry products','Trocars','Shaver products','Suture passers','Compression sleeves','Air-transfer mattresses'],
  teams: ['Team A','Team B','Team C'],
  categories: ['Equipment','Logistical','Ergonomic','Training','Teamwork','Safety','Motivation/Enthusiasm/Energy','Other'],
  interruptionCategories: ['equipment','material','SOP/clarification','training/help','quality hold','planned changeover','facility interruption','staffing','other'],
};
export const scoreFields = ['mood','readiness','sopClarity','resources','experience','quality','safety','workload','teamSupport','pride'];
export const textFields = ['note','explanation','helpDetail','concernDetail','workedWell','improvement','recognition','proposal','applicableArea','estimatedCost','expectedValue','expectedResult','supporters','interruptionNote','challengeDetail','segmentStart','segmentEnd','newStage','newProduct','qualityStatus','reworkObservation'];
export type ProductionEntry = {definition?:ProductionDefinition;id:string;reference:string;form:'arr'|'prr';formIdentity:string;formVersion:string;operator:string;username:string;data:Record<string,any>;status:string;revision:number;submittedAt:string;updatedAt:string;dataSource:'synthetic_seed'|'interactive_demo';lateEntry:boolean;proposalUpdate?:string;history:{at:string;by:string;action:string;note:string;visibility:'worker'|'internal'}[];shares:Record<string,{assignedAt:string;retractedAt?:string}>;photo?:string;sourceEntryId?:string;relatedId?:string};
export function workToday(at = new Date()) { return new Intl.DateTimeFormat('en-CA',{timeZone:productionConfig.timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(at); }
export function dayOffset(date:string,n:number) {return new Date(Date.parse(date+'T12:00:00Z')+n*86400000).toISOString().slice(0,10);}
export function validDate(v:unknown) {const s=text(v,10);check(/^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s+'T12:00:00Z')) && new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s,'Enter a valid work date.');return s;}
export function productionAnswers(form:string,input:any,definition?:ProductionDefinition) {
 check(input && typeof input==='object' && !Array.isArray(input),'Enter form answers.');
 if(definition){
  const phase=form==='arr'?input.entryType:'all';
  if(form==='arr')check(['bod','changeover','eod'].includes(phase),'Choose an entry type.');
  const data=definitionAnswers(definition,input,phase);data.workDate=validDate(input.workDate);check(data.workDate<=workToday(),'Work date cannot be in the future.');
  check(productionConfig.shifts.some(s=>s.id===input.shift),'Choose a valid shift.');check(productionConfig.stages.includes(input.stage),'Choose a valid stage.');
  data.shift=input.shift;data.stage=input.stage;data.product=text(input.product,600);data.team=text(input.team,160);check(data.product&&data.team,'Choose a product and crew.');if(form==='arr')data.entryType=phase;
  if(data.safetyConcern||data.qualityConcern)check(data.concernDetail,'Describe the work-related concern.');
  return data;
 }
 const d:Record<string,any>={}; d.workDate=validDate(input.workDate);check(d.workDate<=workToday(),'Work date cannot be in the future.');
 for(const [key,options] of Object.entries({shift:productionConfig.shifts.map(s=>s.id),stage:productionConfig.stages,product:productionConfig.products,team:productionConfig.teams})) {d[key]=text(input[key],160);check(definition&&(key==='product'||key==='team')?!!d[key]:options.includes(d[key]),`Choose a valid ${key}.`);}
 for(const k of textFields) if(input[k]!==undefined) d[k]=text(input[k],1500);
 for(const k of scoreFields) if(input[k]!==undefined && input[k]!=='' && input[k]!==null) {check(typeof input[k]==='number' && input[k]>=1 && input[k]<=10 && Number.isInteger(input[k]*2),`Invalid ${k} score.`);d[k]=input[k];}
 for(const k of ['units','interruptionMinutes']) if(input[k]!==undefined && input[k]!=='' && input[k]!==null) {check(typeof input[k]==='number' && Number.isFinite(input[k]) && input[k]>=0 && input[k]<=100000 && Number.isInteger(input[k]),`Invalid ${k}.`);d[k]=input[k];}
 for(const k of ['safetyConcern','qualityConcern']) {if(input[k]!==undefined) check(typeof input[k]==='boolean',`Invalid ${k}.`);d[k]=input[k]===true;}
 if(d.safetyConcern||d.qualityConcern) check(d.concernDetail,'Describe the work-related concern.');
 if(input.helpNeeded!==undefined) {check(['No','Maybe','Yes'].includes(input.helpNeeded),'Invalid help choice.');d.helpNeeded=input.helpNeeded;}
 for(const k of ['categories','interruptions','challenges','recognitionPeople']) if(input[k]!==undefined) {check(Array.isArray(input[k]) && input[k].length <= (k==='recognitionPeople'?2:12),'Invalid selections.');d[k]=[...new Set(input[k].map((s:unknown)=>text(s,100)))];}
 if(d.interruptions) check(d.interruptions.every((v:string)=>productionConfig.interruptionCategories.includes(v)),'Choose valid interruption categories.');
 for(const key of ['segmentStart','segmentEnd']) if(d[key]) check(/^([01]\d|2[0-3]):[0-5]\d$/.test(d[key]),'Use HH:MM segment times.');
 if(d.newStage) check(productionConfig.stages.includes(d.newStage),'Choose a valid new stage.');
 if(d.newProduct) check(!!definition||productionConfig.products.includes(d.newProduct),'Choose a valid new product.');
 if(d.qualityStatus) check(['On track','Concern resolved','Follow-up needed'].includes(d.qualityStatus),'Choose a valid quality status.');
 if(d.recognitionPeople) check(d.recognitionPeople.every((v:string)=>/^person-([1-9]|[12]\d|30)$/.test(v)),'Choose a fictional teammate.');
 if(form==='arr') {check(['bod','changeover','eod'].includes(input.entryType),'Choose an entry type.');d.entryType=input.entryType;check(d.sopClarity!==undefined,'Enter SOP clarity.');if(d.entryType==='bod') check(d.mood!==undefined&&d.readiness!==undefined&&d.resources!==undefined,'Complete the beginning-of-shift scores.');if(d.entryType==='eod') check(['experience','quality','safety','workload','teamSupport','pride'].every(k=>d[k]!==undefined),'Complete the end-of-shift scores.');}
 else {check(d.proposal,'Describe your proposal.');check(d.categories?.length && d.categories.every((c:string)=>productionConfig.categories.includes(c)),'Choose improvement categories.');}
 if(definition)return definitionAnswers(definition,{...input,...d},d.entryType||'all');
 return d;
}
export function lateEod(d:Record<string,any>,at:string) {
 if(d.entryType!=='eod') return false;
 const parts = new Intl.DateTimeFormat('en-CA',{timeZone:productionConfig.timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(at));
 const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));const date=`${p.year}-${p.month}-${p.day}`;const minutes=Number(p.hour)*60+Number(p.minute);
 const deadline=d.shift==='swing'?dayOffset(d.workDate,1):d.workDate;const end=d.shift==='swing'?180:990;
 return date>deadline || (date===deadline && minutes>end);
}
