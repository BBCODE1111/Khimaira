import {spellPitch} from './music.js?v=1.0.7';

// A visible, keyboard-accessible chromatic palette shared by both editors.
export function rootPicker(key, value, onChange) {
 const group=document.createElement('div');
 group.className='root-picker';group.setAttribute('role','group');group.setAttribute('aria-label','12 半音根音');
 for(let root=0;root<12;root++){
  const button=document.createElement('button');button.type='button';
  button.textContent=spellPitch(root,key);button.dataset.root=root;
  button.setAttribute('aria-pressed',String(root===Number(value)));
  button.onclick=()=>{
   for(const item of group.children)item.setAttribute('aria-pressed',String(item===button));
   onChange(root);
  };
  group.append(button);
 }
 return group;
}
