import { db, shopBySlug, type Product } from '../../data';

type OrderRequest={slug?:unknown;items?:unknown;name?:unknown;email?:unknown;phone?:unknown;address?:unknown;requestKey?:unknown;website?:unknown};
type PreviousOrder={id:string;request_fingerprint:string|null;total:number;currency:string;status:string};
const error=(message:string,status:number)=>Response.json({error:message},{status});
const clean=(value:unknown,max:number)=>typeof value==='string'?value.trim().slice(0,max):'';

export async function POST(request:Request){
 try{
  const raw=await request.text();
  if(raw.length>20_000)return error('Commande trop volumineuse.',413);
  let body:OrderRequest;
  try{body=JSON.parse(raw) as OrderRequest}catch{return error('Commande invalide.',400)}
  if(!body||typeof body!=='object'||Array.isArray(body))return error('Commande invalide.',400);
  const slug=clean(body.slug,80),name=clean(body.name,100),email=clean(body.email,200),phone=clean(body.phone,40),address=clean(body.address,500),requestKey=clean(body.requestKey,36);
  if(body.website)return error('Commande invalide.',400);
  if(!slug||!name||!/^\S+@\S+\.\S+$/.test(email)||!phone||!address||!Array.isArray(body.items)||!body.items.length||body.items.length>50||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestKey))return error('Vérifiez les coordonnées et le panier.',400);
  const shop=await shopBySlug(slug);if(!shop)return error('Boutique introuvable.',404);
  const unique=new Map<string,number>();
  for(const item of body.items){
   if(!item||typeof item!=='object'||typeof item.id!=='string'||item.id.length>80||!Number.isInteger(item.quantity)||item.quantity<1||item.quantity>99)return error('Quantité invalide.',400);
   unique.set(item.id,(unique.get(item.id)||0)+item.quantity);
  }
  const signature=JSON.stringify({shopId:shop.id,name,email,phone,address,items:[...unique].sort(([a],[b])=>a.localeCompare(b))});
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(signature));
  const fingerprint=Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
  const existing=await db().prepare('SELECT id,request_fingerprint,total,currency,status FROM orders WHERE request_key=? AND shop_id=?').bind(requestKey,shop.id).first<PreviousOrder>();
  if(existing)return existing.request_fingerprint===fingerprint?Response.json({orderId:existing.id,total:existing.total,currency:existing.currency,status:existing.status,paymentInstructions:shop.payment_instructions},{status:200}):error('Cette tentative de commande a déjà été utilisée. Rechargez le panier pour recommencer.',409);
  const entries=[];let total=0,currency='';
  for(const [id,quantity] of unique){
   if(quantity>99)return error('Quantité invalide.',400);
   const p=await db().prepare('SELECT * FROM products WHERE id=? AND shop_id=?').bind(id,shop.id).first<Product>();
   if(!p)return error('Un produit n’est plus disponible.',400);
   if(currency&&currency!==p.currency)return error('La commande ne peut pas mélanger plusieurs devises.',400);
   currency=p.currency;total+=p.price*quantity;entries.push({id:p.id,name:p.name,price:p.price,quantity});
  }
  if(total>1_000_000_000)return error('Montant trop élevé.',400);
  const orderId=crypto.randomUUID(),createdAt=new Date().toISOString();
  try{
   await db().batch([
    db().prepare('INSERT INTO orders (id,shop_id,customer_name,customer_email,customer_phone,delivery_address,items_json,total,currency,status,created_at,request_key,request_fingerprint) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(orderId,shop.id,name,email,phone,address,JSON.stringify(entries),total,currency,'nouvelle',createdAt,requestKey,fingerprint),
    db().prepare('INSERT INTO order_events (id,order_id,shop_id,status,payment_status,created_at) VALUES (?,?,?,?,?,?)').bind(crypto.randomUUID(),orderId,shop.id,'nouvelle','non payé',createdAt)
   ]);
  }catch(e){
   const duplicate=await db().prepare('SELECT id,request_fingerprint,total,currency,status FROM orders WHERE request_key=? AND shop_id=?').bind(requestKey,shop.id).first<PreviousOrder>();
   if(!duplicate)throw e;
   if(duplicate.request_fingerprint!==fingerprint)return error('Cette tentative de commande a déjà été utilisée.',409);
   return Response.json({orderId:duplicate.id,total:duplicate.total,currency:duplicate.currency,status:duplicate.status,paymentInstructions:shop.payment_instructions});
  }
  return Response.json({orderId,total,currency,status:'nouvelle',paymentInstructions:shop.payment_instructions},{status:201});
 }catch(e){console.error('Order creation failed',e);return error('Impossible d’enregistrer la commande. Réessayez.',503)}
}
