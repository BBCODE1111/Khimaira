import assert from 'node:assert/strict';
// Independent SMF reader: inspect metadata as well as paired channel events.
export function readMidi(bytes){
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),tracks=[],notes=[],meta=[],controls=[];
 let pos=14;const vlq=()=>{let n=0,b;do{b=bytes[pos++];n=n*128+(b&127);}while(b&128);return n;};
 for(let track=0;track<view.getUint16(10);track++){
  const end=pos+8+view.getUint32(pos+4);pos+=8;let tick=0,running=0;const active=new Map();
  while(pos<end){tick+=vlq();let status=bytes[pos++];if(status<128){pos--;status=running;}else if(status<240)running=status;
   if(status===255){const type=bytes[pos++],length=vlq();meta.push({track,tick,type,data:[...bytes.slice(pos,pos+length)]});pos+=length;continue;}
   assert.ok(status<240,'unexpected system event');
   const a=bytes[pos++],b=[12,13].includes(status>>4)?undefined:bytes[pos++],channel=status&15,key=channel+':'+a;
   if(status>>4===9&&b){assert.ok(!active.has(key),'overlap '+key);active.set(key,{track,channel,note:a,start:tick,velocity:b});}
   if(status>>4===8||status>>4===9&&!b){const n=active.get(key);assert.ok(n,'unpaired off');assert.ok(tick>n.start);notes.push({...n,end:tick});active.delete(key);}
   if(status>>4===11)controls.push({track,channel,tick,controller:a,value:b});
  }
  assert.equal(active.size,0,'stuck MIDI notes');assert.equal(pos,end);tracks.push({tick});
 }
 return {notes,meta,controls,tracks,ppq:view.getUint16(12)};
}
