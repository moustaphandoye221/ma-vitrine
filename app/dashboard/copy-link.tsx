'use client';
import { useState } from 'react';
import { Copy,Check } from 'lucide-react';
export default function CopyLink({slug}:{slug:string}){
 const [copied,setCopied]=useState(false);
 return <button className="shop-link-copy" type="button" onClick={async()=>{try{await navigator.clipboard.writeText(window.location.origin+'/boutique/'+slug);setCopied(true);setTimeout(()=>setCopied(false),2500)}catch{setCopied(false)}}}>{copied?<Check size={17}/>:<Copy size={17}/>} {copied?'Lien copié':'Copier le lien'}</button>
}
