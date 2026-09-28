import { env } from 'cloudflare:workers';
export type Shop = { id:string;owner_id:string;slug:string;name:string;description:string;avatar_key:string|null;cover_key:string|null;payment_instructions:string;meta_pixel_id:string|null;whatsapp_number:string|null;accent_color:string;cover_position:number;cover_blur:number;cover_shade:number;surface_theme:string;hero_align:string;hero_height:string;card_style:string;catalog_columns:number;created_at:string };
export type Product = { id:string;shop_id:string;name:string;description:string;price:number;currency:string;image_key:string|null;payment_url:string|null;created_at:string };
export const db = () => env.DB!;
export const bucket = () => env.BUCKET!;
export async function ownedShop(ownerId:string) { return db().prepare('SELECT * FROM shops WHERE owner_id = ?').bind(ownerId).first<Shop>(); }
export async function shopBySlug(slug:string) { return db().prepare('SELECT * FROM shops WHERE slug = ?').bind(slug).first<Shop>(); }
export async function shopProducts(shopId:string) { const r=await db().prepare('SELECT * FROM products WHERE shop_id = ? ORDER BY created_at DESC').bind(shopId).all<Product>(); return r.results; }
export { imageUrl, formatPrice } from './format';
