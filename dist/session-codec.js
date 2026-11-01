// Only undo snapshots use a structural pool. The live score remains readable,
// and old v5 JSON without a pool is still accepted. No musical data is discarded.
export function encodeSession(saved){
 const values=[],ids=new Map();
 function pack(value){
  if(value===null||typeof value!=='object')return value;
  const key=JSON.stringify(value);
  if(ids.has(key))return {ref:ids.get(key)};
  const encoded=Array.isArray(value)?value.map(pack):Object.fromEntries(Object.entries(value).map(([k,v])=>[k,pack(v)]));
  const id=values.length;values.push(encoded);ids.set(key,id);return {ref:id};
 }
 const history=saved.harmony.history.map(pack);
 return JSON.stringify({...saved,harmony:{...saved.harmony,history},undoPool:{version:1,values}});
}
export function decodeSession(saved){
 if(!saved.undoPool)return saved;
 const {version,values}=saved.undoPool;
 if(version!==1||!Array.isArray(values)||values.length>100000)throw Error('Invalid undo pool');
 const cache=new Map(),active=new Set();
 function unpack(value){
  if(value===null||typeof value!=='object')return value;
  if(Object.keys(value).length===1&&Object.hasOwn(value,'ref')){
   const id=value.ref;
   if(!Number.isInteger(id)||id<0||id>=values.length||active.has(id))throw Error('Invalid undo reference');
   if(cache.has(id))return structuredClone(cache.get(id));
   active.add(id);const decoded=expand(values[id]);active.delete(id);cache.set(id,decoded);return structuredClone(decoded);
  }
  throw Error('Invalid pooled value');
 }
 function expand(value){
  if(!value||typeof value!=='object')throw Error('Invalid undo entry');
  return Array.isArray(value)?value.map(unpack):Object.fromEntries(Object.entries(value).map(([k,v])=>[k,unpack(v)]));
 }
 const result={...saved,harmony:{...saved.harmony,history:saved.harmony.history.map(unpack)}};
 delete result.undoPool;return result;
}
