import Link from 'next/link';
import { sellerData } from '../../shared';
import ProductForm from '../../product-form';
import DashboardTools from '../../webmcp';
export const dynamic='force-dynamic';
export default async function Nouveau({searchParams}:{searchParams:Promise<{message?:string}>}){const {shop}=await sellerData('/dashboard/produits/nouveau');const {message}=await searchParams;return <><DashboardTools/><Link className="seller-back" href="/dashboard/produits">← Retour aux produits</Link><div className="seller-heading"><div><span className="seller-eyebrow">CATALOGUE</span><h1>Ajouter un produit</h1><p>Présentez votre article aux visiteurs de votre boutique.</p></div></div>{shop?<div className="seller-form-card">{message&&<div className="alert error" role="alert">{message}</div>}<ProductForm/></div>:<div className="seller-empty"><h2>Créez votre boutique</h2><Link className="seller-solid" href="/dashboard/boutique">Ouvrir ma boutique</Link></div>}</>}
