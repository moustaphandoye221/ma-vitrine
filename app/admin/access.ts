import { env } from 'cloudflare:workers';
import { notFound } from 'next/navigation';
import { requireChatGPTUser, type ChatGPTUser } from '../chatgpt-auth';
export function isAdmin(user:ChatGPTUser|null){const allowed=String((env as unknown as Record<string,unknown>).ADMIN_EMAILS||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);return !!user&&allowed.includes(user.email.toLowerCase());}
export async function requireAdmin(){const user=await requireChatGPTUser('/admin');if(!isAdmin(user))notFound();return user;}
