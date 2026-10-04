import {check,id,now,text,type User} from './model.js';
import type {WorkspaceTx} from './store.js';
export type ProductionField={key:string;label:string;type:'text'|'textarea'|'number'|'score'|'select'|'multi'|'checkbox';page:number;required:boolean;options:string[];active:boolean;phase?:string};
export type ProductionDefinition={title:string;description:string;fields:ProductionField[]};
const field=(key:string,label:string,type:ProductionField['type']='textarea',phase='all',required=false,options:string[]=[]):ProductionField=>({key,label,type,phase,page:1,required,options,active:true});
export function initialDefinition(form:string):ProductionDefinition {
 const common=[field('workDate','Shift work date','text'),field('shift','Shift','text'),field('stage','Production stage / station','text'),field('product','Product family','text'),field('team','Crew','text')];
 const arr=[field('entryType','Check-in type','text'),...['mood','readiness','sopClarity','resources','experience','quality','safety','workload','teamSupport','pride'].map(k=>field(k,({mood:'How is your workday looking?',readiness:'How ready do you feel for today’s upcoming assignment?',sopClarity:'How clear are the SOP and instructions?',resources:'Do you have the tools and information you need?',experience:'How did your shift feel?',quality:'How confident are you in the quality of your work?',safety:'How safe did the work feel?',workload:'How manageable was the assignment?',teamSupport:'How supported did you feel?',pride:'How satisfied are you with your workmanship?'} as Record<string,string>)[k],'score',['experience','quality','safety','workload','teamSupport','pride'].includes(k)?'eod':k==='sopClarity'?'all':'bod')),
 field('units','Self-reported moves (optional)','number'),field('lot','Lot / batch (optional)','text'),field('rejects','Rejected quantity (optional)','number'),field('rework','Rework quantity (optional)','number'),field('exception','Work exception (optional)'),field('recognition','Did someone help make your work easier, clearer, or safer today?'),field('recognitionPeople','Teammates who helped','multi'),...['note','helpDetail','concernDetail','workedWell','improvement','interruptionNote','challengeDetail','qualityStatus','reworkObservation','segmentStart','segmentEnd','newStage','newProduct'].map(k=>field(k,({note:'Work note',helpDetail:'What clarification or assistance would help?',concernDetail:'Work-related safety or quality concern',workedWell:'What worked well?',improvement:'What could make the work easier?',interruptionNote:'Interruption context',challengeDetail:'Work challenge',qualityStatus:'Quality status',reworkObservation:'Rework observation',segmentStart:'Assignment start',segmentEnd:'Assignment end',newStage:'Next production stage / station',newProduct:'Next product family'} as Record<string,string>)[k]||k)),field('helpNeeded','Would clarification help?','select','all',false,['No','Maybe','Yes']),field('safetyConcern','Safety concern','checkbox'),field('qualityConcern','Quality concern','checkbox'),field('interruptions','Interruptions','multi'),field('challenges','Work challenges','multi'),field('interruptionMinutes','Interruption minutes','number')];
 const prr=[field('categories','What kind of improvement?','multi','all',true,['Equipment','Logistical','Ergonomic','Training','Teamwork','Safety','Motivation/Enthusiasm/Energy','Other']),field('proposal','Briefly explain your proposal','textarea','all',true),...['applicableArea','estimatedCost','expectedValue','expectedResult','supporters','note'].map(k=>field(k,({applicableArea:'Where would this apply?',estimatedCost:'Estimated implementation cost',expectedValue:'Expected benefit',expectedResult:'Expected production result',supporters:'Others supporting the proposal',note:'Additional context'} as Record<string,string>)[k]))];
 return{title:form==='arr'?'Achievement Recognition Review':'Production Request Review',description:'Independent fictional production demonstration. Safety and quality first.',fields:[...common,...(form==='arr'?arr:prr)]};
}
/** Reconstructed from the deployed production UI and validator, not the new questions.
 * The commit identifies the immutable original rendering, conditional rules and defaults.
 * These definitions describe history only; they never validate a newly submitted form.
 */
const LEGACY_SOURCE={commit:'0dc01b92768f3d279d3ecadecc8160b5447de597',paths:['apps/arr-v2/backend/services/api/src/access/public/production.js','apps/arr-v2/backend/services/api/src/access/workspace/production-model.ts'],kind:'archived deployed definition reconstruction'};
const LEGACY_STAGES=['Receiving and Sorting','Cleaning / Decontamination','Inspection','Functional Testing','Repair / Reassembly','Final Quality Review','Packaging'];
const LEGACY_PRODUCTS=['EP catheters','Electrosurgical devices','Ultrasonic devices','Ablation devices','ECG products','Pulse-oximetry products','Trocars','Shaver products','Suture passers','Compression sleeves','Air-transfer mattresses'];
const LEGACY_INTERRUPTS=['equipment','material','SOP/clarification','training/help','quality hold','planned changeover','facility interruption','staffing','other'];
export function legacyProductionDefinition(form:string,phase='all'):ProductionDefinition {
 const f=(key:string,label:string,type:ProductionField['type']='textarea',required=false,options:string[]=[],extra:any={}):ProductionField=>({...field(key,label,type,'all',required,options),page:2,...extra});
 const score=(key:string,label:string,required=true)=>f(key,label,'score',required,[],{min:1,max:10,step:.5,defaultValue:5,anchors:['1 · Low','5 · In between','10 · High']});
 const common=[f('workDate','Work date','text',true,[],{page:1,originalControl:'date'}),f('shift','Shift','select',true,['day','swing'],{page:1}),f('stage','Production stage / station','select',true,LEGACY_STAGES,{page:1}),f('product','Product family','select',true,LEGACY_PRODUCTS,{page:1}),f('team','Team / work group','select',true,['Team A','Team B','Team C'],{page:1})];
 const concern=f('concernDetail','Brief work-related concern','textarea',false,[],{requiredWhen:phase==='bod'?'safetyConcern === true':'safetyConcern === true || qualityConcern === true'});
 const recognition=[f('recognition','If you’d like, describe what they did.'),f('recognitionPeople','Who helped?','multi',false,Array.from({length:30},(_,n)=>`person-${n+1}`),{maxSelections:2,excludesCurrentAssociate:true})];
 let questions:ProductionField[]=[];
 if(form==='prr')questions=[f('categories','What kind of improvement are you suggesting?','multi',true,['Equipment','Logistical','Ergonomic','Training','Teamwork','Safety','Motivation/Enthusiasm/Energy','Other']),f('proposal','In two or three sentences, what would you change?','textarea',true),f('estimatedCost','What might it cost to try?','text',false,[],{defaultValue:'Unsure'}),f('expectedValue','What value could this bring?'),f('expectedResult','What result would you hope to see?','textarea',true,[],{requiredBy:'UI only; original API did not require this field'}),f('supporters','Have others shared a similar idea? (optional)')];
 else if(phase==='bod')questions=[score('mood','How is your workday looking as you get started?'),score('readiness','How ready do you feel for today’s assignment?'),score('sopClarity','How clear are the SOP and quality expectations?'),score('resources','Do you have the tools, materials and information you need?'),f('helpNeeded','Would training, clarification or teammate assistance help?','select',false,['No','Maybe','Yes'],{defaultValue:'No'}),f('helpDetail','What would help? (optional)'),f('safetyConcern','Any immediate quality or safety concern before starting?','checkbox',false,[],{defaultValue:false}),concern,f('note','Anything else about the work ahead? (optional)')];
 else {
  const changeover=phase==='changeover';
  questions=[...(changeover?[f('segmentStart','Approximate segment start','text',false,[],{originalControl:'time'}),f('segmentEnd','Approximate segment end','text',false,[],{originalControl:'time'}),f('qualityStatus','Quality and safety status','select',false,['On track','Concern resolved','Follow-up needed'],{defaultValue:'On track'})]:[score('experience','How did your shift go overall?')]),score('quality','How confident are you in the quality of the work?',!changeover),score('safety','How safe did the work feel?',!changeover),score('sopClarity','How clear were the SOP and quality expectations?'),...(!changeover?[score('workload','How achievable was the workload?'),score('teamSupport','How supported did you feel by your team?'),score('pride','How satisfied are you with workmanship and organization?')]:[]),f('safetyConcern','Any safety concern needing follow-up?','checkbox',false,[],{defaultValue:false}),f('qualityConcern','Any quality concern needing follow-up?','checkbox',false,[],{defaultValue:false}),concern,f('units','Approximate units processed (optional)','number',false,[],{min:0,max:100000,step:1}),f('interruptions','Any interruption or downtime?','multi',false,LEGACY_INTERRUPTS,{originalControl:'single select named downtimeCategory',storageMapping:'selection stored as zero- or one-element interruptions array'}),f('interruptionMinutes','Approximate minutes (optional)','number',false,[],{min:0,max:1440,step:1,apiMaximum:100000}),f('challenges','Anything that made the work harder? (optional)','multi',false,['Quality','Safety','Ergonomics','Lighting / small print','Lifting / reach','Assembly / orientation','Tool access','SOP clarity']),f('workedWell','What worked especially well? (optional)'),f('improvement','What would make the work safer, clearer or easier next time? (optional)'),...recognition,...(changeover?[f('newStage','Next stage / station','select',true,LEGACY_STAGES,{requiredBy:'UI only'}),f('newProduct','Next product family','select',true,LEGACY_PRODUCTS,{requiredBy:'UI only'})]:[])];
 }
 const definition:any={title:form==='arr'?'Achievement Recognition Review':'Production Request Review',description:form==='arr'?'Small observations can make a meaningful difference.':'Share a practical improvement. We’ll keep you connected to the next steps.',fields:[...(form==='arr'?[f('entryType','When are you checking in?','select',true,['bod','changeover','eod'],{page:1})]:[]),...common,...questions],archivedSource:LEGACY_SOURCE,version:'0.1.0',readOnly:true};
 if(form==='arr'&&phase==='all'){
  definition.phaseDefinitions=Object.fromEntries(['bod','changeover','eod'].map(p=>[p,legacyProductionDefinition(form,p)]));
  // Generic historical editor view: union, while entry reads select their exact phase.
  definition.fields=[...new Map(Object.values(definition.phaseDefinitions).flatMap((d:any)=>d.fields).map((q:any)=>[q.key,q])).values()];
  definition.legacyNotes=['The old UI populated estimatedCost: Unsure in ARR drafts without asking an ARR cost question. Raw stored data is retained; that field is not reinterpreted as an ARR question.','Original sliders defaulted to 5. A recorded value does not establish whether a slider was actively changed.'];
 }
 return definition;
}
/** Never borrow a newer definition to interpret an older record. */
export async function definitionForProductionEntry(tx:WorkspaceTx,entry:any):Promise<ProductionDefinition|undefined>{
 if(entry.definition)return structuredClone(entry.definition);
 if(!['arr','prr'].includes(entry.form)||entry.formIdentity!==`production-demo-${entry.form}`)return undefined;
 if(entry.formVersion==='0.1.0')return legacyProductionDefinition(entry.form,entry.data?.entryType||'all');
 const form=await tx.get('production-form',entry.form),version=form?.versions?.find((v:any)=>v.version===entry.formVersion);
 return version?.definition?structuredClone(version.definition):undefined;
}
export async function ensureProductionForms(tx:WorkspaceTx){
 for(const name of ['arr','prr']){
  const f=await tx.get('production-form',name);if(!f||f.definition)continue;
  check(f.version==='0.1.0','Cannot reconstruct an unknown historical production form version.');
  const stamp=now(),legacy=legacyProductionDefinition(name),definition=initialDefinition(name);
  const upgraded={...f,version:'0.1.1',revision:(f.revision||0)+1,definition,publishedAt:stamp,versions:[{version:'0.1.0',definition:legacy,at:f.publishedAt||null,by:'migration',summary:'Archived deployed production-alpha questions and phase-specific defaults',source:LEGACY_SOURCE},{version:'0.1.1',definition,at:stamp,by:'approved-release',summary:'Continuous-shift production release; question-specific scales and versioned content'}]};
  await tx.put('production-form',name,upgraded);
  const key=id();await tx.put('production-event',key,{id:key,at:stamp,by:'approved-release',action:'production form upgraded',form:name,beforeVersion:f.version,afterVersion:upgraded.version,source:LEGACY_SOURCE});
 }
}
function validatedDefinition(value:any):ProductionDefinition{
 check(value&&typeof value==='object'&&Array.isArray(value.fields)&&value.fields.length<=100,'Invalid form definition.');
 const keys=new Set<string>();
 const fields=value.fields.map((f:any)=>{const key=text(f.key,80);check(/^[a-zA-Z][a-zA-Z0-9_]*$/.test(key)&&!['__proto__','constructor','prototype','status','operator','formVersion','dataSource'].includes(key)&&!keys.has(key),'Question keys must be unique and safe.');keys.add(key);
 check(['text','textarea','number','score','select','multi','checkbox'].includes(f.type),'Unsupported question type.');check(Number.isInteger(f.page)&&f.page>=1&&f.page<=20,'Invalid question page.');check(typeof f.required==='boolean'&&typeof f.active==='boolean','Question flags required.');check(Array.isArray(f.options)&&f.options.length<=100,'Invalid answer options.');const phase=f.phase||'all';check(['all','bod','changeover','eod'].includes(phase),'Invalid question phase.');return{key,label:text(f.label,300),type:f.type,page:f.page,required:f.required,active:f.active,phase,options:f.options.map((v:any)=>text(v,300))};});
 return{title:text(value.title,200),description:text(value.description||'',2000),fields};
}
export function definitionAnswers(definition:ProductionDefinition,input:any,phase='all'){
 check(input&&typeof input==='object'&&!Array.isArray(input),'Invalid answers.');const out:Record<string,any>={};
 for(const f of definition.fields.filter(f=>f.active&&(!f.phase||f.phase==='all'||f.phase===phase))){const value=input[f.key];const empty=value===undefined||value===null||value===''||Array.isArray(value)&&!value.length;check(!f.required||!empty,`Complete ${f.label}.`);if(empty)continue;
 if(f.type==='number'||f.type==='score'){check(typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=100000,`Invalid ${f.label}.`);if(f.type==='score')check(value>=1&&value<=10&&Number.isInteger(value*2),`Invalid ${f.label}.`);out[f.key]=value;}
 else if(f.type==='checkbox'){check(typeof value==='boolean',`Invalid ${f.label}.`);out[f.key]=value;}
 else if(f.type==='multi'){check(Array.isArray(value)&&value.length<=100,`Invalid ${f.label}.`);const vs=value.map((v:any)=>text(v,300));check(!f.options.length||vs.every((v:string)=>f.options.includes(v)),`Choose valid ${f.label}.`);out[f.key]=vs;}
 else{const v=text(value,2000);check(f.type!=='select'||!f.options.length||f.options.includes(v),`Choose valid ${f.label}.`);out[f.key]=v;}}
 return out;
}
export async function formRoutes(tx:WorkspaceTx,u:User|undefined,route:string,input:any){
 if(!['production-form-admin','production-form-draft','production-form-publish'].includes(route))return undefined;
 check(u&&(u.role==='owner'||u.role==='admin'&&u.forms.includes(input.form)),'Form administrator access required.',403);
 check(['arr','prr'].includes(input.form),'Unknown form.');const f=await tx.get('production-form',input.form);check(f,'Form unavailable.');
 if(route==='production-form-admin')return{form:f};
 check(input.revision===f.revision,'Form changed. Refresh before saving.',409);const before=structuredClone(f);
 if(route==='production-form-draft'){const definition=validatedDefinition(input.definition);f.draft={definition,by:u.username,at:now(),summary:text(input.summary||'',2000)};}
 else{check(u.role==='owner','Only A+ publishes form versions.',403);check(f.draft,'Save a draft first.');const parts=f.version.split('.').map(Number);check(parts.length===3&&parts.every(Number.isInteger),'Invalid current version.');parts[2]++;f.version=parts.join('.');f.definition=f.draft.definition;f.publishedAt=now();f.versions.push({version:f.version,definition:structuredClone(f.definition),at:f.publishedAt,by:u.username,summary:f.draft.summary});delete f.draft;}
 f.revision++;await tx.put('production-form',f.id,f);const event=id();await tx.put('production-event',event,{id:event,at:now(),by:u.username,action:route,before,after:f});return{form:f};
}
