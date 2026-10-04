import {check,id,now,text,type User} from './model.js';
import type {WorkspaceTx} from './store.js';
import candidates from './production-candidates.json';
export type Product={id:string;name:string;common:boolean;active:boolean;aliases:string[];revision:number;candidate?:boolean;classification?:string};
export const commonProducts=['Compression sleeves','Disposable pulse-ox sensors','ECG leads/patient cables','Tourniquet cuffs','Air-transfer products','Manifolds','Arthroscopic shaver blades','Bits/burs/blades','Laryngoscope blades','Trocars/cannulas','Harmonic scalpels/shears','LigaSure/vessel sealers','Ablation devices','Suture passers/retrievers','Reusable pulse-ox sensors','EP devices/diagnostic catheters','Shaver handpieces/accessories'];
const normalize=(v:string)=>v.trim().toLocaleLowerCase().replace(/\s+/g,' ');
export async function seedProducts(tx:WorkspaceTx){
 if(await tx.get('production-migration','catalog-v1'))return;
 const names=new Set<string>();let n=0;
 for(const name of commonProducts){names.add(normalize(name));const key=`family-${++n}`;await tx.put('production-product',key,{id:key,name,common:true,active:true,aliases:[],revision:1});}
 for(const c of candidates){if(names.has(normalize(c.name)))continue;names.add(normalize(c.name));const key=`candidate-${++n}`;await tx.put('production-product',key,{id:key,name:c.name,common:false,active:true,aliases:[],revision:1,candidate:true,classification:c.classification});}
 await tx.put('production-migration','catalog-v1',{at:now(),source:'supplied FDA-derived candidate dataset; illustrative demo catalog, not a facility-approved processing scope'});
}
export async function resolveProduct(tx:WorkspaceTx,name:string,actor:string){
 const value=text(name,600);check(value,'Choose or enter a product.');
 const all=await tx.list<Product>('production-product');
 const product=all.find(p=>p.active&&(normalize(p.name)===normalize(value)||p.aliases.some(a=>normalize(a)===normalize(value))));
 if(product)return {product:product.name,productId:product.id,originalProduct:value};
 const existing=(await tx.list('production-unmatched')).find(p=>normalize(p.name)===normalize(value)&&!p.resolvedAt);
 if(!existing){const key=id();await tx.put('production-unmatched',key,{id:key,name:value,enteredBy:actor,at:now()});}
 return {product:value,originalProduct:value,unmatched:true};
}
export async function catalogRoutes(tx:WorkspaceTx,u:User|undefined,authenticated:boolean,route:string,input:any){
 if(!route.startsWith('production-product-'))return undefined;
 check(authenticated,'Please sign in.',401);
 const admin=!!u&&(u.role==='owner'||u.role==='admin'&&u.forms.some(f=>['arr','prr'].includes(f)));
 if(route==='production-product-list'){
 const query=text(input.query||'',600).toLowerCase();
 const all=await tx.list<Product>('production-product');
 return {products:all.filter(p=>(p.active||admin&&input.includeInactive===true)&&(!query||[p.name,...p.aliases].some(v=>v.toLowerCase().includes(query)))).sort((a,b)=>Number(b.common)-Number(a.common)||a.name.localeCompare(b.name)),unmatched:admin?(await tx.list('production-unmatched')).filter(v=>!v.resolvedAt):[]};
 }
 check(admin,'Catalog administrator access required.',403);
 if(route==='production-product-save'){
 const prior=input.id?await tx.get<Product>('production-product',text(input.id,100)):undefined;
 if(input.id)check(prior&&prior.revision===input.revision,'Product changed. Refresh before saving.',409);
 const name=text(input.name,600);check(name,'Enter a name.');
 check(typeof input.common==='boolean'&&typeof input.active==='boolean','Specify catalog flags.');
 const aliases=input.aliases||[];check(Array.isArray(aliases)&&aliases.length<=50,'Invalid aliases.');
 const clean=aliases.map((a:any)=>text(a,600)).filter(Boolean);
 const all=await tx.list<Product>('production-product');
 for(const other of all.filter(v=>v.id!==prior?.id))check(![other.name,...other.aliases].some(a=>[name,...clean].some(b=>normalize(a)===normalize(b))),'Name or alias already belongs to a catalog product.');
 const p:Product={...prior,id:prior?.id||id(),name,common:input.common,active:input.active,aliases:clean,revision:(prior?.revision||0)+1};
 await tx.put('production-product',p.id,p);const event=id();await tx.put('production-event',event,{id:event,at:now(),by:u!.username,action:'catalog product saved',before:prior,after:p});return{product:p};
 }
 if(route==='production-product-resolve'){
 const unmatched=await tx.get('production-unmatched',text(input.id,100));check(unmatched&&!unmatched.resolvedAt,'Unmatched entry unavailable.');
 let p:Product|undefined=input.productId?await tx.get('production-product',text(input.productId,100)):undefined;
 if(input.productId)check(p?.active,'Choose an active product.');
 if(!p){const name=text(input.name||unmatched.name,600);check(name,'Enter a product name.');check(!(await tx.list<Product>('production-product')).some(v=>[v.name,...v.aliases].some(alias=>normalize(alias)===normalize(name))),'Product name or alias already exists; map to it instead.');p={id:id(),name,common:input.common===true,active:true,aliases:[],revision:1};}
 const conflict=(await tx.list<Product>('production-product')).some(v=>v.id!==p!.id&&[v.name,...v.aliases].some(alias=>normalize(alias)===normalize(unmatched.name)));check(!conflict,'This entered name already maps to another catalog product. Refresh and choose that product.');
 if(normalize(unmatched.name)!==normalize(p.name)&&!p.aliases.includes(unmatched.name))p.aliases.push(unmatched.name);
 p.revision++;await tx.put('production-product',p.id,p);
 await tx.put('production-unmatched',unmatched.id,{...unmatched,productId:p.id,resolvedAt:now(),resolvedBy:u!.username});
 // Preserve the exact recorded wording. Analytical mappings are resolved by alias,
 // and catalog revision is part of allocation fingerprints.
 const event=id();await tx.put('production-event',event,{id:event,at:now(),by:u!.username,action:'unmatched product mapped',before:unmatched,after:{productId:p.id}});return{product:p};
 }
 check(false,'Unknown catalog operation.',404);
}
