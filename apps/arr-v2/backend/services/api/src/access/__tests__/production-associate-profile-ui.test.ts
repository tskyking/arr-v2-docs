import {readFile} from 'node:fs/promises';
import {describe,expect,it} from 'vitest';

const sourcePath=new URL('../public/production.js',import.meta.url);

describe('fictional associate profiles in the production UI',()=>{
 it('presents names and aliases while allowing either alias or email at sign-in',async()=>{
  const source=await readFile(sourcePath,'utf8');
  expect(source).toContain('function associateLabel');
  expect(source).toContain('function associateLabelById');
  expect(source).toContain('Fictional Mfg. Associate alias or email');
  expect(source).toContain('Use a fictional person-1 through person-30 alias or its demo.com email address.');
  expect(source).toContain("[result.user?.username,result.user?.profile?.email.toLowerCase()].includes(entered)");
  expect(source).toContain('${esc(associateLabel(S.user))}');
  expect(source).toContain('${esc(associateLabel(p))}');
  expect(source).toContain('${esc(associateLabel(o))}');
  expect(source).toContain('name:associateLabel(o)');
  expect(source).toContain('${esc(associateLabelById(s.operator||s.username))}');
  expect(source).toContain('${esc(associateLabelById(r.operator||r.username))}');
 });
});
