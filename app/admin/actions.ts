'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from './access';
import { db } from '../data';
export async function updateShop(form:FormData){await requireAdmin();const id=String(form.get('id')||'');if(!id||id.length>100)throw new Error('Boutique invalide');const path='/admin/boutiques/'+encodeURIComponent(id);const name=String(form.get('name')||'').trim(),description=String(form.get('description')||'').trim(),instructions=String(form.get('payment_instructions')||'').trim();if(!name||name.length>80||description.length>500||!instructions||instructions.length>500)redirect(path+'?error=1');const result=await db().prepare('UPDATE shops SET name=?,description=?,payment_instructions=? WHERE id=?').bind(name,description,instructions,id).run();if(!result.meta.changes)redirect('/admin/boutiques');revalidatePath('/admin');revalidatePath('/admin/boutiques');revalidatePath('/boutiques');redirect(path+'?saved=1');}
