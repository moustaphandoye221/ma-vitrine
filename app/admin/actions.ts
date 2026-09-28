'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from './access';
import { db } from '../data';
export async function updateShop(form:FormData){await requireAdmin();const id=String(form.get('id')||'');if(!id||id.length>100)throw new Error('Boutique invalide');const path='/admin/boutiques/'+encodeURIComponent(id);const name=String(form.get('name')||'').trim(),description=String(form.get('description')||'').trim(),instructions=String(form.get('payment_instructions')||'').trim();if(!name||name.length>80||description.length>500||!instructions||instructions.length>500)redirect(path+'?error=1');const result=await db().prepare('UPDATE shops SET name=?,description=?,payment_instructions=? WHERE id=?').bind(name,description,instructions,id).run();if(!result.meta.changes)redirect('/admin/boutiques');revalidatePath('/admin');revalidatePath('/admin/boutiques');revalidatePath('/boutiques');redirect(path+'?saved=1');}
export async function updateSubscription(form:FormData){
  await requireAdmin();
  const shopId=String(form.get('shop_id')||'');
  if(!/^[a-zA-Z0-9-]{1,100}$/.test(shopId))throw new Error('Boutique invalide');
  const path='/admin/boutiques/'+encodeURIComponent(shopId);
  const plan=String(form.get('plan')||''), cycle=String(form.get('billing_cycle')||''),status=String(form.get('status')||''),note=String(form.get('note')||'').trim();
  const expiration=String(form.get('expires_at')||'');
  if(!['decouverte','boutique','studio'].includes(plan)||!['none','monthly','annual'].includes(cycle)||!['active','trial','past_due','canceled'].includes(status)||note.length>500||!/^\d{4}-\d{2}-\d{2}$/.test(expiration)&&!!expiration||(plan==='decouverte')!==(cycle==='none'))redirect(path+'?subscription_error=1');
  const shop=await db().prepare('SELECT id FROM shops WHERE id=?').bind(shopId).first();
  if(!shop)redirect('/admin/boutiques');
  const now=new Date().toISOString();
  await db().prepare('INSERT INTO subscriptions (id,shop_id,plan,billing_cycle,status,expires_at,note,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(shop_id) DO UPDATE SET plan=excluded.plan,billing_cycle=excluded.billing_cycle,status=excluded.status,expires_at=excluded.expires_at,note=excluded.note,updated_at=excluded.updated_at').bind(crypto.randomUUID(),shopId,plan,cycle,status,expiration?expiration+'T23:59:59.000Z':null,note,now,now).run();
  revalidatePath('/admin');revalidatePath('/admin/abonnements');revalidatePath(path);redirect(path+'?subscription_saved=1');
}
