import { describe, expect, it } from 'vitest';
import { productionAnswers, lateEod, workToday } from '../workspace/production-model.js';
const context = {workDate:'2026-01-02',shift:'day',stage:'Cleaning / Decontamination',product:'EP catheters',team:'Team A'};
const bod = {...context,entryType:'bod',mood:7.5,readiness:8,sopClarity:8,resources:8};
describe('Production alpha independent validation QA', () => {
  it('supports decimal mood and optional counts without trusting injected authority fields', () => {
    const result=productionAnswers('arr',{...bod,operator:'person-2',status:'implemented',dataSource:'authorized_pilot'});
    expect(result.mood).toBe(7.5); expect(result.units).toBeUndefined();
    expect(result.operator).toBeUndefined(); expect(result.status).toBeUndefined(); expect(result.dataSource).toBeUndefined();
  });
  it('rejects invalid calendar dates, step values and non-numeric counts', () => {
    for(const change of [{workDate:'2026-02-30'},{mood:7.25},{mood:NaN},{mood:11},{units:'10'},{units:-1},{units:Infinity},{safetyConcern:'false'}]) {
      expect(()=>productionAnswers('arr',{...bod,...change})).toThrow();
    }
  });
  it('requires work-related concern detail but does not force mood explanations', () => {
    expect(()=>productionAnswers('arr',{...bod,mood:1})).not.toThrow();
    expect(()=>productionAnswers('arr',{...bod,safetyConcern:true})).toThrow();
    expect(productionAnswers('arr',{...bod,safetyConcern:true,concernDetail:'Fictional work concern'}).safetyConcern).toBe(true);
  });
  it('bounds recognition to two fictional people', () => {
    expect(()=>productionAnswers('arr',{...bod,recognitionPeople:['person-1','person-2','person-3']})).toThrow();
    expect(()=>productionAnswers('arr',{...bod,recognitionPeople:['not-an-account']})).toThrow();
  });
  it('requires proposal/category for PRR without requiring ARR score fields', () => {
    expect(()=>productionAnswers('prr',{...context,proposal:'Fictional lighting improvement',categories:['Ergonomic']})).not.toThrow();
    expect(()=>productionAnswers('prr',{...context,proposal:'Fictional idea',categories:['Unknown']})).toThrow();
  });
  it('uses Pacific calendar dates and maintains Swing work-date deadline after midnight', () => {
    expect(workToday(new Date('2026-10-03T06:59:00Z'))).toBe('2026-10-02');
    expect(workToday(new Date('2026-10-03T07:00:00Z'))).toBe('2026-10-03');
    const swing={...context,workDate:'2026-10-02',shift:'swing',entryType:'eod'};
    expect(lateEod(swing,'2026-10-03T08:30:00Z')).toBe(false);
    expect(lateEod(swing,'2026-10-03T10:00:00Z')).toBe(false);
    expect(lateEod(swing,'2026-10-03T10:01:00Z')).toBe(true);
    expect(lateEod({...swing,entryType:'bod'},'2026-10-05T10:01:00Z')).toBe(false);
  });
  it('uses winter Pacific offset rather than hard-coded daylight saving UTC hours', () => {
    const swing={...context,shift:'swing',entryType:'eod'};
    expect(lateEod(swing,'2026-01-03T11:00:00Z')).toBe(false);
    expect(lateEod(swing,'2026-01-03T11:01:00Z')).toBe(true);
  });
});
