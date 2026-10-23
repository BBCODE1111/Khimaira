import {test} from 'node:test';import assert from 'node:assert/strict';
import {examplePool,nextExample} from '../dist/example-pool.js';
import {contrastExamples,moodOrder} from '../dist/contrast-examples.js';
import {styles} from '../dist/style-engine.js';
import {worldScales} from '../dist/world-styles.js';
import {parseChart,serialize} from '../dist/solutions.js';
import {parse,mod} from '../dist/music.js';
import {performance} from '../dist/performance.js';

test('every style has four distinct new directions and at least seven unique examples',()=>{
 for(const style of Object.keys(styles)){
  const pool=examplePool(style);assert.ok(pool.length>=7,style+' '+pool.length);
  assert.equal(contrastExamples[style].length,4);
  assert.deepEqual([...new Set(pool.map(p=>p.category))].sort(),[...moodOrder].sort(),style);
  assert.deepEqual(pool.slice(0,4).map(p=>p.category),moodOrder);
  for(let i=1;i<pool.length;i++)if(pool[i].category===pool[i-1].category)assert.ok(pool.slice(i).every(p=>p.category===pool[i].category),'unnecessary same-mood repetition '+style);
  assert.equal(new Set(pool.map(p=>serialize(parseChart(p.chart)))).size,pool.length,style);
  const short=contrastExamples[style].map(p=>serialize(parseChart(p.chart).slice(0,4)));
  assert.equal(new Set(short).size,4,style+' four-bar contrast');
  assert.ok(pool.every(p=>p.mood.length<=9&&!p.title.includes('undefined')),style);
 }
});
test('INSPIRE visits every example exactly once, includes studies and references, and follows manual LOAD by ID',()=>{
 for(const style of Object.keys(styles)){
  const pool=examplePool(style),visited=[];let id=null;
  for(let n=0;n<pool.length;n++){const p=nextExample(pool,id);visited.push(p.id);id=p.id;}
  assert.equal(new Set(visited).size,pool.length,style);
  assert.equal(nextExample(pool,id).id,visited[0]);
  for(let n=0;n<pool.length;n++)assert.equal(nextExample(pool,pool[n].id).id,pool[(n+1)%pool.length].id);
  assert.equal(nextExample(pool,'another-style').id,pool[0].id);
 }
 assert.equal(nextExample([],null),null);
});
test('all new charts parse, preserve four-beat bars, and produce playable distinct audio/MIDI schedules',()=>{
 for(const [style,examples] of Object.entries(contrastExamples)){
  const schedules=[];for(const p of examples){const bars=parseChart(p.chart);
   assert.ok(bars.every(b=>b.chords.reduce((n,c)=>n+c.beats,0)===4),style);
   const events=performance(bars,styles[style].pattern,{voicing:p.open?'open':styles[style].voicing,gate:p.feel.gate/100,human:p.feel.human/100});
   assert.ok(events.length>0);assert.ok(events.every(n=>n.duration>0&&n.beat+n.duration<=bars.length*4+.00001),style);
   schedules.push(JSON.stringify(events));
   if(styles[style].strict){const allowed=worldScales[styles[style].scaleIds[0]].intervals;
    for(const b of bars)for(const c of b.chords){const chord=parse(c.symbol);assert.ok([...chord.pcs,chord.bass].every(n=>allowed.includes(n)),style+' '+c.symbol);}
    assert.ok(events.every(n=>allowed.includes(mod(n.note))),style+' performed scale');
   }
  }
  assert.equal(new Set(schedules).size,4,style);
 }
});
test('new major and minor blues examples retain full twelve-bar forms',()=>{
 for(const style of ['Major blues','Minor blues'])for(const p of contrastExamples[style])assert.equal(parseChart(p.chart).length,12);
});
