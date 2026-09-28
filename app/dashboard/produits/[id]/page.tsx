import Link from 'next/link';
import { notFound } from 'next/navigation';
import { sellerData } from '../../shared';
import ProductForm from '../../product-form';
import { db } from '../../../data';
import type { GalleryImage } from '../../gallery-field';
export const dynamic='force-dynamic';
export default async function Modifier({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{message?:string}>}){const {id}=await params;const {message}=await searchParams;const {products}=await sellerData('/dashboard/produits/'+id);const product=products.find(p=>p.id===id);if(!product)notFound();const images=(await db().prepare('SELECT id,image_key,position FROM product_images WHERE product_id=? AND shop_id=? ORDER BY position,id').bind(id,product.shop_id).all<GalleryImage>()).results;return <><Link className="seller-back" href="/dashboard/produits">← Retour aux produits</Link><div className="seller-heading"><div><span className="seller-eyebrow">CATALOGUE</span><h1>Modifier le produit</h1><p>{product.name}</p></div></div><div className="seller-form-card">{message&&<div className="alert error" role="alert">{message}</div>}<ProductForm product={product} images={images}/></div></>}
