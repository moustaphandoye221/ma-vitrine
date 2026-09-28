import Link from 'next/link';
import { notFound } from 'next/navigation';
import { shopBySlug, shopProducts } from '../../../data';
import Cart from './cart';
import MetaTracking from '../../meta-tracking';
export const dynamic='force-dynamic';
export default async function Panier({params}:{params:Promise<{slug:string}>}){const {slug}=await params;let shop,products;try{shop=await shopBySlug(slug);if(shop)products=await shopProducts(shop.id)}catch{return <p className="alert error">Panier indisponible.</p>}if(!shop)notFound();return <main className="site-shell"><MetaTracking slug={slug} pixelId={shop.meta_pixel_id}/><header className="topbar"><Link className="brand" href="/"><img className="mavitrine-mark" src="/mavitrine-logo.png" alt="" width="36" height="36"/> mavitrine</Link><nav><Link href={'/boutique/'+slug}>← {shop.name}</Link></nav></header><h1 className="page-title">Votre panier</h1><Cart slug={slug} products={products||[]}/></main>}
