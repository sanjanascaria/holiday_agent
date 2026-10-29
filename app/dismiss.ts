'use client';
import {useEffect, useRef, type RefObject, type PointerEvent as ReactPointerEvent} from 'react';

/** Close nonmodal popovers without swallowing the next control's click. */
export function useOutsideDismiss<T extends HTMLElement>(ref:RefObject<T|null>, dismiss:()=>void, enabled=true){
 useEffect(()=>{
  if(!enabled)return;
  const outside=(event:Event)=>{if(ref.current&&event.target instanceof Node&&!ref.current.contains(event.target))dismiss();};
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape')dismiss();};
  document.addEventListener('pointerdown',outside,true);
  document.addEventListener('focusin',outside);
  document.addEventListener('keydown',escape);
  return ()=>{document.removeEventListener('pointerdown',outside,true);document.removeEventListener('focusin',outside);document.removeEventListener('keydown',escape);};
 },[ref,dismiss,enabled]);
}

/** A backdrop click dismisses; a drag starting inside the dialog does not. */
export function useDialogBackdrop(dismiss:()=>void,disabled=false){
 const startedOutside=useRef(false);
 function outside(event:ReactPointerEvent<HTMLDialogElement>){
  const rect=event.currentTarget.getBoundingClientRect();
  return event.target===event.currentTarget&&(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom);
 }
 return {
  onPointerDown:(event:ReactPointerEvent<HTMLDialogElement>)=>{startedOutside.current=event.button===0&&outside(event);},
  onPointerUp:(event:ReactPointerEvent<HTMLDialogElement>)=>{const close=startedOutside.current&&outside(event);startedOutside.current=false;if(close&&!disabled)dismiss();},
  onPointerCancel:()=>{startedOutside.current=false;},
 };
}
