'use client';
import { useState } from 'react';
import { imageUrl } from '../../../format';

export default function ProductGallery({name,keys}:{name:string;keys:string[]}){
 const [active,setActive]=useState(0);
 return <div className="store-gallery"><div className="store-detail-photo"><img src={imageUrl(keys[active])!} alt={active===0?name:name+' — vue '+(active+1)} fetchPriority={active===0?'high':undefined}/></div>{keys.length>1&&<div className="store-gallery-thumbs" aria-label="Photos du produit">{keys.map((key,index)=><button type="button" key={key} aria-label={'Afficher la photo '+(index+1)+' de '+name} aria-pressed={active===index} onClick={()=>setActive(index)}><img src={imageUrl(key)!} alt=""/></button>)}</div>}</div>
}
