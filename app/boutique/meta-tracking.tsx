'use client';
import { useEffect,useState } from 'react';

type PixelFunction=((...args:unknown[])=>void)&{callMethod?:(...args:unknown[])=>void;queue?:unknown[][];loaded?:boolean;version?:string};
type PixelWindow=Window&{fbq?:PixelFunction;_fbq?:PixelFunction};
type ShopEvent={slug:string;name:'AddToCart'|'InitiateCheckout'|'Lead';params?:Record<string,unknown>};
const validPixel=(value:string)=>/^\d{8,30}$/.test(value);
const allowedEvents=new Set(['AddToCart','InitiateCheckout','Lead']);

function startPixel(pixelId:string){
 const win=window as PixelWindow;
 if(!win.fbq){
  const fbq=((...args:unknown[])=>{if(fbq.callMethod)fbq.callMethod(...args);else fbq.queue!.push(args)}) as PixelFunction;
  fbq.queue=[];fbq.loaded=true;fbq.version='2.0';win.fbq=fbq;win._fbq=fbq;
  const script=document.createElement('script');script.async=true;script.src='https://connect.facebook.net/en_US/fbevents.js';document.head.appendChild(script);
 }
 const initialized=(win as PixelWindow&{__mavitrinePixels?:Set<string>}).__mavitrinePixels ||= new Set<string>();
 if(!initialized.has(pixelId)){win.fbq!('init',pixelId);initialized.add(pixelId)}
 win.fbq!('trackSingle',pixelId,'PageView');
}

export function metaEvent(slug:string,name:ShopEvent['name'],params?:Record<string,unknown>){
 if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent<ShopEvent>('mavitrine-meta-event',{detail:{slug,name,params}}));
}

export default function MetaTracking({slug,pixelId,productId}:{slug:string;pixelId:string|null;productId?:string}){
 const [choice,setChoice]=useState<'accepted'|'refused'|null>(null);
 const [showPrompt,setShowPrompt]=useState(false);
 const key='mavitrine-meta-consent-'+slug;
 useEffect(()=>{
  if(!pixelId||!validPixel(pixelId))return;
  try{const stored=localStorage.getItem(key);setChoice(stored==='accepted'||stored==='refused'?stored:null);setShowPrompt(stored!=='accepted'&&stored!=='refused')}catch{setShowPrompt(true)}
 },[key,pixelId]);
 useEffect(()=>{
  if(choice!=='accepted'||!pixelId||!validPixel(pixelId))return;
  startPixel(pixelId);
  if(productId)(window as PixelWindow).fbq?.('trackSingle',pixelId,'ViewContent',{content_ids:[productId],content_type:'product'});
  const handler=(event:Event)=>{
   const {detail}=event as CustomEvent<ShopEvent>;
   if(detail?.slug===slug&&allowedEvents.has(detail.name)){
    (window as PixelWindow).fbq?.('trackSingle',pixelId,detail.name,detail.params||{});
   }
  };
  window.addEventListener('mavitrine-meta-event',handler);
  return()=>window.removeEventListener('mavitrine-meta-event',handler);
 },[choice,pixelId,productId,slug]);
 if(!pixelId||!validPixel(pixelId))return null;
 const decide=(value:'accepted'|'refused')=>{
  try{localStorage.setItem(key,value)}catch{}
  setChoice(value);setShowPrompt(false);
 };
 return <div className="meta-consent-ui">
  {showPrompt&&<aside className="meta-consent-panel" aria-label="Choix de mesure d’audience"><p><strong>Mesure d’audience Meta</strong><br/>Cette boutique souhaite mesurer les visites et les demandes de commande avec Meta Pixel. Aucun paiement n’est suivi comme achat.</p><div><button type="button" onClick={()=>decide('refused')}>Refuser</button><button type="button" onClick={()=>decide('accepted')}>Accepter</button></div></aside>}
  {!showPrompt&&choice&&<button className="meta-consent-link" type="button" onClick={()=>setShowPrompt(true)}>Choix de mesure</button>}
 </div>;
}
