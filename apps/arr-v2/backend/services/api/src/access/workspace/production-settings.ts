import {check,id,now,text,type User} from './model.js';
import type {WorkspaceTx} from './store.js';
export async function settingsRoutes(tx:WorkspaceTx,u:User|undefined,route:string,input:any){
 if(!['production-settings-get','production-settings-save'].includes(route))return undefined;
 check(u&&(u.role==='owner'||u.role==='admin'),'Administrator access required.',403);
 const prior=await tx.get('production-settings','main');
 if(route==='production-settings-get')return{settings:{...prior,revision:prior.revision||1,cutoffHour:prior.cutoffHour??3,crewAssignments:prior.crewAssignments||{}},staff:(await tx.list<User>('user')).filter(v=>v.active).map(v=>({id:v.id,username:v.username,role:v.role,forms:v.forms})),permissions:u.role==='owner'?await tx.entries('production-permission'):[]};
 check(input.revision===(prior.revision||1),'Settings changed. Refresh before saving.',409);
 const data=input.settings;check(data&&typeof data==='object','Invalid settings.');
 check(Number.isInteger(data.cutoffHour)&&data.cutoffHour>=0&&data.cutoffHour<=6,'Cutoff must be 0–6 Pacific hours.');
 check(Array.isArray(data.teams)&&data.teams.length>0&&data.teams.length<=30,'Enter 1–30 crew names.');const teams=[...new Set(data.teams.map((v:any)=>text(v,100)))];check(teams.every(Boolean),'Crew name required.');
 check(data.crewAssignments&&typeof data.crewAssignments==='object'&&!Array.isArray(data.crewAssignments),'Invalid crew assignments.');
 const crewAssignments:Record<string,any>={};for(const [key,assignment] of Object.entries(data.crewAssignments) as [string,any][]){const op=await tx.get('production-operator',key);check(op?.active,'Unknown associate.');check(teams.includes(assignment.team),'Choose an existing crew.');const a:any={team:assignment.team};
 for(const [field,role] of [['leadId','reviewer'],['managerId','manager']])if(assignment[field]){const user=await tx.get<User>('user',text(assignment[field],100));check(user?.active&&(user.role===role||role==='manager'&&user.role==='owner'&&(await tx.get('production-permission',user.id))?.operationalManager)&& (user.role==='owner'||user.forms.includes('arr')),'Choose an active staff member with required role and ARR access.');a[field]=user.id;}
 crewAssignments[key]=a;}
 const settings={...prior,teams,crewAssignments,cutoffHour:data.cutoffHour,revision:(prior.revision||1)+1};await tx.put('production-settings','main',settings);const event=id();await tx.put('production-event',event,{id:event,at:now(),by:u.username,action:'crew settings changed',before:prior,after:settings});return{settings};
}
