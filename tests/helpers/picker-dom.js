// Minimal DOM for exercising the real picker event handlers in Node.
// Layout, native focus visibility and touch geometry are tested in browser CI.
export function pickerDOM(){
 const match=(el,selector)=>{
  if(selector===':disabled')return !!el.disabled;
  const enabled=!selector.includes(':not(:disabled)')||!el.disabled;
  selector=selector.replace(':not(:disabled)','');
  const attrs=[...selector.matchAll(/\[([^=\]]+)(?:="([^"]*)")?\]/g)];
  const base=selector.replace(/\[[^\]]+\]/g,'');
  return enabled&&(!base||base[0]==='.'?(!base||el.className.split(' ').includes(base.slice(1))):base[0]==='#'?el.id===base.slice(1):el.tagName===base.toUpperCase())&&attrs.every(([,k,v])=>el.getAttribute(k)!==null&&(v===undefined||el.getAttribute(k)===v));
 };
 class Element{
  constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.attributes={};this.dataset={};this.className='';this.textContent='';this.value='';}
  append(...children){for(const e of children){e.parent=this;this.children.push(e);}}
  prepend(...children){for(const e of children)e.parent=this;this.children.unshift(...children);}
  replaceChildren(...children){for(const e of this.children)e.parent=null;this.children=[];this.append(...children);}
  add(e){this.append(e);}
  after(...children){const i=this.parent.children.indexOf(this);for(const e of children)e.parent=this.parent;this.parent.children.splice(i+1,0,...children);}
  setAttribute(k,v){this.attributes[k]=String(v);}
  getAttribute(k){return this.attributes[k]??null;}
  get options(){return this.children;}
  get selectedOptions(){return this.children.filter(e=>String(e.value)===String(this.value));}
  get isConnected(){return this===body||!!this.parent?.isConnected;}
  querySelectorAll(selector){
   const parts=selector.split(' '),all=[];
   const visit=e=>{for(const c of e.children){all.push(c);visit(c);}};visit(this);
   return all.filter(el=>{
    if(!match(el,parts.at(-1)))return false;
    let parent=el.parent;
    for(let i=parts.length-2;i>=0;i--){while(parent&&!match(parent,parts[i]))parent=parent.parent;if(!parent)return false;parent=parent.parent;}
    return true;
   });
  }
  querySelector(s){return this.querySelectorAll(s)[0]||null;}
  focus(){document.activeElement=this;}
  scrollIntoView(){}
  addEventListener(){}
 }
 const body=new Element('body'),listeners={};
 const document={body,activeElement:body,createElement:t=>new Element(t),querySelector:s=>body.querySelector(s),querySelectorAll:s=>body.querySelectorAll(s),getElementById:id=>body.querySelector('#'+id),addEventListener:(type,fn)=>{listeners[type]=fn;}};
 const Option=function(text,value){const e=new Element('option');e.textContent=text;e.value=value;return e;};
 const shell=new Element('div');shell.className='score-shell';const grid=new Element('div');grid.id='grid';shell.append(grid);
 const quick=new Element('div');quick.className='quick-entry';body.append(shell,quick);
 return {document,Option,grid,escape:()=>listeners.keydown({key:'Escape',preventDefault(){}}),render(bars){
  grid.replaceChildren(...bars.map(b=>{const bar=new Element('div');bar.className='bar';const lane=new Element('div');lane.className='chord-lane';bar.append(lane);
   for(const c of b.chords){const e=new Element('button');e.className='chord-event';e.textContent=c.symbol;lane.append(e);}return bar;}));
 }};
}
