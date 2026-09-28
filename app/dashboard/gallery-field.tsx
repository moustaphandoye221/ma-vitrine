'use client';
import { useEffect,useState } from 'react';
import { imageUrl } from '../format';

export type GalleryImage={id:string;image_key:string;position:number};
export default function GalleryField({images}:{images:GalleryImage[]}){
 const [files,setFiles]=useState<File[]>([]),[removed,setRemoved]=useState<string[]>([]),[error,setError]=useState('');
 const [previews,setPreviews]=useState<string[]>([]);
 useEffect(()=>{const urls=files.map(file=>URL.createObjectURL(file));setPreviews(urls);return()=>urls.forEach(url=>URL.revokeObjectURL(url))},[files]);
 const visible=images.filter(image=>!removed.includes(image.id));
 return <fieldset className="seller-gallery-field"><legend>Photos supplémentaires</legend><p>Ajoutez jusqu’à 4 photos pour montrer le produit sous plusieurs angles. La première photo reste la photo principale du catalogue.</p>
  {images.length>0&&<div className="seller-gallery-grid">{images.map(image=><div className="seller-gallery-item" key={image.id}><img src={imageUrl(image.image_key)!} alt="Photo supplémentaire du produit"/><button type="button" onClick={()=>setRemoved(current=>current.includes(image.id)?current.filter(id=>id!==image.id):[...current,image.id])}>{removed.includes(image.id)?'Annuler la suppression':'Supprimer cette photo'}</button>{removed.includes(image.id)&&<span>Supprimée après enregistrement</span>}</div>)}</div>}
  {removed.map(id=><input key={id} type="hidden" name="remove_gallery" value={id}/>)}
  {previews.length>0&&<div className="seller-gallery-grid">{previews.map((src,i)=><img className="seller-gallery-preview" key={src} src={src} alt={'Nouvelle photo '+(i+1)}/>)}</div>}
  <label htmlFor="gallery-upload">Ajouter des photos</label><input id="gallery-upload" name="gallery" type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={e=>{const selected=Array.from(e.target.files||[]);if(selected.length+visible.length>4||selected.some(file=>file.size>5_000_000||!['image/jpeg','image/png','image/webp'].includes(file.type))){setFiles([]);e.target.value='';setError('Maximum 4 photos au total, en JPG, PNG ou WebP de 5 Mo chacune.')}else{setFiles(selected);setError('')}}}/><small>4 photos maximum · JPG, PNG ou WebP · 5 Mo par photo</small>{error&&<p className="alert error" role="alert">{error}</p>}
 </fieldset>
}
