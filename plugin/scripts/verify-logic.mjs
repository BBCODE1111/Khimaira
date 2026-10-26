import fs from 'node:fs';
import assert from 'node:assert/strict';
import {parseChart} from '../../dist/solutions.js';
import {performance} from '../../dist/performance.js';
const file=process.argv[2];const data=fs.readFileSync(file);let p=0;
const str=n=>{const s=data.toString('ascii',p,p+n);p+=n;return s;};
const u16=()=>{const n=data.readUInt16BE(p);p+=2;return n;},u32=()=>{const n=data.readUInt32BE(p);p+=4;return n;};
const vlq=()=>{let n=0,b;do{b=data[p++];n=n*128+(b&127);}while(b&128);return n;};
assert.equal(str(4),'MThd');assert.equal(u32(),6);u16();const tracks=u16(),ppq=u16();assert.ok(ppq<32768);
const events=[];
for(let track=0;track<tracks;track++){
 assert.equal(str(4),'MTrk');const end=u32()+p;let tick=0,status=0;
 while(p<end){tick+=vlq();if(data[p]&128)status=data[p++];if(status===255){p++;{const length=vlq();p+=length;}continue;}if(status===240||status===247){{const length=vlq();p+=length;}continue;}const type=status>>4,n=data[p++],v=(type===12||type===13)?0:data[p++];if(type===9&&v>0)events.push({beat:tick/ppq,note:n,velocity:v});}
}
const bars=parseChart('| Cmaj7 | Am7 | Dm7 | G7 | Em7 | A7 | Dm7 | G7 |');
const expected=performance(bars,'jazz',{voicing:'rootless',gate:.82,human:.2,swing:.16,rate:.5,seed:42,bassMode:'root',balladEntry:'together',arpFoundation:'off',arpAccent:'beat',arpMode:'upDown',arpRate:'16',arpOctaves:2,arpPhase:'flow',arpSeed:1,bpm:120});
const sort=(a,b)=>a.note-b.note||a.beat-b.beat;let maxError=0;const cycles=[];
const startCycle=Number(process.argv[3]||0);
for(let cycle=startCycle;cycle<startCycle+3;cycle++){
 const actual=events.filter(e=>e.beat>=cycle*32&&e.beat<(cycle+1)*32).map(e=>({...e,beat:e.beat-cycle*32})).sort(sort);
 const ref=[...expected].sort(sort);assert.equal(actual.length,ref.length,`cycle ${cycle} count`);
 for(let i=0;i<ref.length;i++){assert.equal(actual[i].note,ref[i].note);assert.equal(actual[i].velocity,Math.round(ref[i].velocity*127));const err=Math.abs(actual[i].beat-ref[i].beat)*480;if(err>1)console.log('over raw tick',cycle,actual[i],ref[i],err);maxError=Math.max(maxError,err);}
 cycles.push(actual.map(e=>[Math.round(e.beat*ppq),e.note,e.velocity]));
}
console.log(JSON.stringify({file,ppq,notesPerCycle:expected.length,maxErrorTicks480:maxError,identicalCycles:JSON.stringify(cycles[0])===JSON.stringify(cycles[1])&&JSON.stringify(cycles[1])===JSON.stringify(cycles[2])},null,2));
for(let c=1;c<3;c++)for(let i=0;i<cycles[0].length;i++)if(JSON.stringify(cycles[0][i])!==JSON.stringify(cycles[c][i]))console.log('cycle diff',c,i,cycles[0][i],cycles[c][i]);assert.ok(maxError<=1,'Logic recording exceeds 1 tick');assert.deepEqual(cycles[0],cycles[1]);assert.deepEqual(cycles[1],cycles[2]);
