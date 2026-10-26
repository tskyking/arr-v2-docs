import {readFile} from 'node:fs/promises';
import {describe, expect, it} from 'vitest';

const sourcePath = new URL('../public/production.js', import.meta.url);
const stylePath = new URL('../public/production.css', import.meta.url);
const htmlPath = new URL('../public/production.html', import.meta.url);

describe('shift queue elapsed-time presentation', () => {
  it('cache-busts the staged Manager queue assets', async () => {
    const html = await readFile(htmlPath, 'utf8');
    expect(html).toContain('production.css?v=20261026-prior-swing-close-v19');
    expect(html).toContain('production.js?v=20261026-prior-swing-close-v19');
  });

  it('shows a live bold shift total beside the crew', async () => {
    const source = await readFile(sourcePath, 'utf8');
    expect(source).toContain('function shiftTotalDuration');
    expect(source).toContain('shift-total-duration');
    expect(source).toContain('data-shift-elapsed-start');
    expect(source).toContain(' · Shift total ');
  });

  it('uses two middle dots between distinct shift fields', async () => {
    const source = await readFile(sourcePath, 'utf8');
    expect(source).toContain("${esc(v.stage)} · · ${esc(v.product)} · · ${esc(timeLabel(v.start))}");
    expect(source).toContain("${!v.end?' · · Changed '+esc(age(v.start)):''} · · ${segmentKindLabel(v)}");
    expect(source).toContain("esc(v.stage)+' · · '+esc(v.product)");
    expect(source).toContain("${v.end?esc(timeLabel(v.end)):'Now'} · · ${segmentKindLabel(v)}");
    expect(source).toContain('${esc(segmentKindName(v))} · <strong class="segment-duration"');
  });

  it('bolds Current without bolding Previous', async () => {
    const source = await readFile(sourcePath, 'utf8');
    expect(source).toContain("title==='Current'?'current-segment-label':''");
    expect(source).not.toContain('<b>${title}</b>');
  });

  it('darkens the full current-operation line without changing previous operations', async () => {
    const [source, styles] = await Promise.all([
      readFile(sourcePath, 'utf8'),
      readFile(stylePath, 'utf8'),
    ]);
    expect(source).toContain("current-segment-row${manager?' current-hover-target':''}");
    expect(styles).toContain('.current-segment-row { color: #263c46; font-weight: 600; background: #f2f7f6; border-left: 2px solid #8aafa9; border-radius: 4px; padding: .12rem .35rem; }');
    expect(styles).toContain('.current-segment-row .segment-kind { color: #263c46; }');
    expect(styles).not.toContain('.shift-summary small { background: #f2f7f6; }');
  });

  it('slightly enlarges Shift total while softening only the bold Previous duration', async () => {
    const [source, styles] = await Promise.all([
      readFile(sourcePath, 'utf8'),
      readFile(stylePath, 'utf8'),
    ]);
    expect(source).toContain("title==='Previous'?'previous-segment-row':''");
    expect(styles).toContain('.queue-summary .shift-total-duration { display:inline; font-size:1.06em; margin:0; }');
    expect(styles).toContain('.previous-segment-row .segment-duration { color: #61727a; }');
    expect(styles).toContain('.segment-duration { color: #263c46; font-weight: 700; }');
    expect(styles).toContain('.current-segment-row .segment-kind { color: #263c46; }');
  });

  it('binds Queue to its own expanded shift and removes collapsed detail markup', async () => {
    const source = await readFile(sourcePath, 'utf8');
    expect(source).toContain('function bind(id,fn,root=document){const el=$(id,root);');
    expect(source).toContain("return openShift(s.id);},el);");
    expect(source).toContain("if(old){await animateDetail(old,false);old.innerHTML='';}");
  });

  it('does not query Gate quantity controls when an SOP-preparation segment has no quantity detail', async () => {
    const source = await readFile(sourcePath, 'utf8');
    const match = source.match(/function bindGateQuantitySync\([\s\S]*?\nfunction updateElapsedDurations/);
    expect(match).not.toBeNull();
    const functionSource = match![0].replace(/\nfunction updateElapsedDurations$/, '');
    const bindGateQuantitySync = new Function('$', 'CSS', 'X', `${functionSource}; return bindGateQuantitySync;`)(
      (selector: string, root: { querySelector: (value: string) => unknown }) => root.querySelector(selector),
      { escape: (value: string) => value },
      { dirty: false },
    );
    let formQueried = false;
    const trainingRoot = { querySelector: () => null };
    const feedbackForm = { querySelector: () => { formQueried = true; return null; } };

    expect(() => bindGateQuantitySync(trainingRoot, feedbackForm, { id: 'training-segment-1', kind: 'training' })).not.toThrow();
    expect(formQueried).toBe(false);
  });

  it('opens final Feedback and keeps assignment change collapsed after End Shift', async () => {
    const source = await readFile(sourcePath, 'utf8');
    expect(source).toContain("finalFeedback?'<button name=\"doAction\" value=\"feedback\" class=\"primary\">Save feedback</button>'");
    expect(source).toContain("if(last?.end){disclosure.open=false;if(finalFeedback){const feedback=$('.feedback-section',f);if(feedback)feedback.open=true;}}");
    expect(source).toContain('assignmentControls.disabled=finalFeedback||!disclosure.open;');
    expect(source).toContain("dynamicQuestions(s.formSnapshot?.definition||s.formSnapshot||publishedDefinition('arr'),finalFeedback?'eod':'all',['sopClarity'],true,last?.kind!=='waiting'&&!finalFeedback)");
    expect(source).toContain("if(kind==='feedback'){run(()=>action('feedback',{data:{...dynamicAnswers(f,'eod',true)}}));return;}");
  });
});
