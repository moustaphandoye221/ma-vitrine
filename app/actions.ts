'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getChatGPTUser } from './chatgpt-auth';
import { db, bucket, ownedShop } from './data';

function clean(value:FormDataEntryValue|null,max:number) { return String(value||'').trim().slice(0,max); }
function destination(message:string,path='/dashboard'): never { redirect(path+'?message='+encodeURIComponent(message)); }
async function upload(file:FormDataEntryValue|null, owner:string, kind:string, returnTo='/dashboard') {
 if (!(file instanceof File) || !file.size) return null;
 if (file.size > 5_000_000 || !['image/jpeg','image/png','image/webp'].includes(file.type)) destination('Image invalide : JPEG, PNG ou WebP, 5 Mo maximum.',returnTo);
 const key=`${owner}/${kind}/${crypto.randomUUID()}`;
 await bucket().put(key,await file.arrayBuffer(),{httpMetadata:{contentType:file.type}});
 return key;
}
function paymentLink(value:string){if(!value)return null;try{const u=new URL(value);if(u.protocol!=='https:')return null;return u.toString()}catch{return null}}
export async function saveShop(form:FormData){
 const user=await getChatGPTUser();if(!user) destination('Connectez-vous pour créer votre boutique.','/dashboard/boutique');
 const name=clean(form.get('name'),80),description=clean(form.get('description'),500),paymentInstructions=clean(form.get('payment_instructions'),500)||'Paiement à la livraison',accentColor=clean(form.get('accent_color'),7);
 const whatsappInput=clean(form.get('whatsapp_number'),32),whatsappNumber=whatsappInput.replace(/[\s()+.-]/g,'');
 if(whatsappInput&&!/^\+?[\d\s().-]+$/.test(whatsappInput)||whatsappNumber&&!/^[1-9]\d{7,14}$/.test(whatsappNumber))destination('Saisissez un numéro WhatsApp international valide, avec indicatif pays.','/dashboard/boutique');
 if(!/^#[0-9a-fA-F]{6}$/.test(accentColor))destination('Choisissez une couleur valide.','/dashboard/boutique');
 if(!name) destination('Indiquez le nom de votre boutique.','/dashboard/boutique');
 const old=await ownedShop(user.userId);
 const desired=clean(form.get('slug'),40).toLowerCase();if(desired&&!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(desired))destination('Le lien doit contenir seulement des lettres, chiffres et tirets.','/dashboard/boutique');
 const slug=desired||old?.slug||'boutique-'+crypto.randomUUID().slice(0,8);
 const taken=await db().prepare('SELECT id FROM shops WHERE slug=?').bind(slug).first<{id:string}>();if(taken&&taken.id!==old?.id)destination('Ce lien est déjà utilisé. Choisissez-en un autre.','/dashboard/boutique');
 const coverPosition=Number(form.get('cover_position')??50),coverBlur=Number(form.get('cover_blur')??2),coverShade=Number(form.get('cover_shade')??55);
 if(!Number.isInteger(coverPosition)||coverPosition<0||coverPosition>100||!Number.isInteger(coverBlur)||coverBlur<0||coverBlur>12||!Number.isInteger(coverShade)||coverShade<40||coverShade>80)destination('Réglages de couverture invalides.','/dashboard/boutique');
 const surfaceTheme=clean(form.get('surface_theme'),20),heroAlign=clean(form.get('hero_align'),20),heroHeight=clean(form.get('hero_height'),20),cardStyle=clean(form.get('card_style'),20),catalogColumns=Number(form.get('catalog_columns'));
 if(!['blanc','brume','glacier'].includes(surfaceTheme)||!['gauche','centre'].includes(heroAlign)||!['compact','standard','grand'].includes(heroHeight)||!['doux','angle'].includes(cardStyle)||![2,3,4].includes(catalogColumns))destination('Réglages de présentation invalides.','/dashboard/boutique');
 const avatar=await upload(form.get('avatar'),user.userId,'avatar','/dashboard/boutique');const cover=await upload(form.get('cover'),user.userId,'cover','/dashboard/boutique');
 const avatarKey=avatar||(form.get('remove_avatar')==='1'?null:old?.avatar_key)||null;const coverKey=cover||(form.get('remove_cover')==='1'?null:old?.cover_key)||null;
 if(old){await db().prepare('UPDATE shops SET name=?, description=?, avatar_key=?, cover_key=?, payment_instructions=?,accent_color=?,slug=?,cover_position=?,cover_blur=?,cover_shade=?,surface_theme=?,hero_align=?,hero_height=?,card_style=?,catalog_columns=?,whatsapp_number=? WHERE id=? AND owner_id=?').bind(name,description,avatarKey,coverKey,paymentInstructions,accentColor,slug,coverPosition,coverBlur,coverShade,surfaceTheme,heroAlign,heroHeight,cardStyle,catalogColumns,whatsappNumber||null,old.id,user.userId).run();}
 else {await db().prepare('INSERT INTO shops (id,owner_id,slug,name,description,avatar_key,cover_key,payment_instructions,accent_color,created_at,cover_position,cover_blur,cover_shade,surface_theme,hero_align,hero_height,card_style,catalog_columns,whatsapp_number) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(),user.userId,slug,name,description,avatarKey,coverKey,paymentInstructions,accentColor,new Date().toISOString(),coverPosition,coverBlur,coverShade,surfaceTheme,heroAlign,heroHeight,cardStyle,catalogColumns,whatsappNumber||null).run();}
 if(old){for(const key of [old.avatar_key!==avatarKey?old.avatar_key:null,old.cover_key!==coverKey?old.cover_key:null]){if(key?.startsWith(user.userId+'/')){try{await bucket().delete(key)}catch{console.error('Image cleanup failed')}}}}
 revalidatePath('/boutique/'+slug);revalidatePath('/boutiques');revalidatePath('/dashboard');revalidatePath('/dashboard/boutique');destination('Boutique enregistrée.','/dashboard/boutique');
}
export async function saveProduct(form:FormData){
 const id=clean(form.get('id'),80);const returnTo=id?'/dashboard/produits/'+id:'/dashboard/produits/nouveau';
 const user=await getChatGPTUser();if(!user)destination('Connectez-vous pour continuer.',returnTo);
 const shop=await ownedShop(user.userId);if(!shop)destination('Créez votre boutique avant d’ajouter un produit.','/dashboard/boutique');
 const name=clean(form.get('name'),100),description=clean(form.get('description'),1000),amount=Number(form.get('price'));
 const currency=clean(form.get('currency'),3);
 const rawLink=clean(form.get('payment_url'),2000),link=paymentLink(rawLink);
 if(!name||!Number.isFinite(amount)||amount<=0||amount>100000000||!['XOF','EUR','USD'].includes(currency))destination('Vérifiez le nom, le prix et la devise du produit.',returnTo);
 if(rawLink&&!link)destination('Le lien de paiement doit commencer par https://.',returnTo);
 const existing=id?await db().prepare('SELECT image_key FROM products WHERE id=? AND shop_id=?').bind(id,shop.id).first<{image_key:string|null}>():null;
 if(id&&!existing)destination('Produit introuvable.',returnTo);
 const gallery=id?(await db().prepare('SELECT id,image_key,position FROM product_images WHERE product_id=? AND shop_id=? ORDER BY position,id').bind(id,shop.id).all<{id:string;image_key:string;position:number}>()).results:[];
 const removeIds=new Set(form.getAll('remove_gallery').filter((value):value is string=>typeof value==='string'));
 const removed=gallery.filter(image=>removeIds.has(image.id));
 const files=form.getAll('gallery').filter((file):file is File=>file instanceof File&&file.size>0);
 const image=form.get('image');
 if(files.length+gallery.length-removed.length>4||files.some(file=>file.size>5_000_000||!['image/jpeg','image/png','image/webp'].includes(file.type)))destination('Maximum 4 photos supplémentaires, en JPG, PNG ou WebP de 5 Mo chacune.',returnTo);
 if(image instanceof File&&image.size&&(image.size>5_000_000||!['image/jpeg','image/png','image/webp'].includes(image.type)))destination('Photo principale invalide : 5 Mo maximum.',returnTo);
 const uploaded:string[]=[];
 try{
  const main=image instanceof File&&image.size?await upload(image,user.userId,'product',returnTo):null;if(main)uploaded.push(main);
  for(const file of files){const key=await upload(file,user.userId,'product',returnTo);if(key)uploaded.push(key)}
  const productId=id||crypto.randomUUID(),now=new Date().toISOString(),mainKey=main||existing?.image_key||null;
  const statements=id?[db().prepare('UPDATE products SET name=?,description=?,price=?,currency=?,payment_url=?,image_key=? WHERE id=? AND shop_id=?').bind(name,description,Math.round(amount*100),currency,link,mainKey,id,shop.id)]:[db().prepare('INSERT INTO products (id,shop_id,name,description,price,currency,image_key,payment_url,created_at) VALUES (?,?,?,?,?,?,?,?,?)').bind(productId,shop.id,name,description,Math.round(amount*100),currency,mainKey,link,now)];
  for(const item of removed)statements.push(db().prepare('DELETE FROM product_images WHERE id=? AND product_id=? AND shop_id=?').bind(item.id,productId,shop.id));
  const nextPosition=Math.max(0,...gallery.map(item=>item.position))+1;
  for(const [index,key] of uploaded.slice(main?1:0).entries())statements.push(db().prepare('INSERT INTO product_images (id,product_id,shop_id,image_key,position) VALUES (?,?,?,?,?)').bind(crypto.randomUUID(),productId,shop.id,key,nextPosition+index));
  await db().batch(statements);
  for(const key of [...removed.map(item=>item.image_key),...(main&&existing?.image_key?[existing.image_key]:[])]){if(key.startsWith(user.userId+'/'))try{await bucket().delete(key)}catch{console.error('Product image cleanup failed')}}
  revalidatePath('/boutique/'+shop.slug);revalidatePath('/boutique/'+shop.slug+'/produit/'+productId);revalidatePath('/dashboard');revalidatePath('/dashboard/produits');
 }catch(error){for(const key of uploaded)try{await bucket().delete(key)}catch{console.error('Product upload cleanup failed')}console.error('Product save failed',error);destination('Impossible d’enregistrer le produit. Réessayez.',returnTo)}
 destination('Produit enregistré.','/dashboard/produits');
}
export async function deleteProduct(form:FormData){
 const user=await getChatGPTUser();if(!user)destination('Connectez-vous pour continuer.');const shop=await ownedShop(user.userId);if(!shop)destination('Boutique introuvable.');
 const id=clean(form.get('id'),80);
 const product=await db().prepare('SELECT image_key FROM products WHERE id=? AND shop_id=?').bind(id,shop.id).first<{image_key:string|null}>();
 if(!product)destination('Produit introuvable.','/dashboard/produits');
 const gallery=(await db().prepare('SELECT image_key FROM product_images WHERE product_id=? AND shop_id=?').bind(id,shop.id).all<{image_key:string}>()).results;
 await db().batch([db().prepare('DELETE FROM product_images WHERE product_id=? AND shop_id=?').bind(id,shop.id),db().prepare('DELETE FROM products WHERE id=? AND shop_id=?').bind(id,shop.id)]);
 for(const key of [product.image_key,...gallery.map(item=>item.image_key)])if(key?.startsWith(user.userId+'/'))try{await bucket().delete(key)}catch{console.error('Product image cleanup failed')}
 revalidatePath('/boutique/'+shop.slug);revalidatePath('/dashboard');revalidatePath('/dashboard/produits');destination('Produit supprimé.','/dashboard/produits');
}

export async function updateOrder(form:FormData){
 const id=clean(form.get('id'),80);const returnTo='/dashboard/commandes/'+id;
 const user=await getChatGPTUser();if(!user)destination('Connectez-vous pour continuer.',returnTo);const shop=await ownedShop(user.userId);if(!shop)destination('Boutique introuvable.',returnTo);
 const status=clean(form.get('status'),40),payment=clean(form.get('payment_status'),40);
 if(!['nouvelle','confirmée','en préparation','expédiée','terminée','annulée'].includes(status)||!['non payé','payé'].includes(payment))destination('Statut invalide.',returnTo);
 const current=await db().prepare('SELECT status,payment_status FROM orders WHERE id=? AND shop_id=?').bind(id,shop.id).first<{status:string;payment_status:string}>();
 if(!current)destination('Commande introuvable.',returnTo);
 if(current.status!==status||current.payment_status!==payment){
  await db().batch([
   db().prepare('UPDATE orders SET status=?,payment_status=? WHERE id=? AND shop_id=?').bind(status,payment,id,shop.id),
   db().prepare('INSERT INTO order_events (id,order_id,shop_id,status,payment_status,created_at) VALUES (?,?,?,?,?,?)').bind(crypto.randomUUID(),id,shop.id,status,payment,new Date().toISOString())
  ]);
 }
 revalidatePath('/dashboard');revalidatePath('/dashboard/commandes');revalidatePath(returnTo);destination('Commande mise à jour.',returnTo);
}
