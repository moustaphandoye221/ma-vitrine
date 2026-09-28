import Link from 'next/link';
import { ShoppingBag, Search, CircleUserRound } from 'lucide-react';
import { getChatGPTUser, requireChatGPTUser } from '../chatgpt-auth';
import { ownedShop } from '../data';
import DashboardNav from './nav';
import { isAdmin } from '../admin/access';
export const dynamic='force-dynamic';
export default async function Layout({children}:{children:React.ReactNode}){const user=await requireChatGPTUser('/dashboard');let shop=null;try{if(user)shop=await ownedShop(user.userId)}catch{}return <main className="seller-app"><DashboardNav slug={shop?.slug||null}/><div className="seller-main"><header className="seller-topbar"><Link className="seller-brand" href="/"><img className="mavitrine-mark" src="/mavitrine-logo.png" alt="" width="36" height="36"/>mavitrine</Link><div className="seller-topbar-right">{isAdmin(user)&&<Link href="/admin">Administration</Link>}<Link href="/boutiques"><Search size={18}/> Explorer</Link><span className="seller-user"><CircleUserRound size={22}/>{user?.fullName||user?.email||'Mon compte'}</span><Link href="/signout-with-chatgpt?return_to=/" className="seller-signout">Déconnexion</Link></div></header><div className="seller-content"><nav className="seller-utility" aria-label="Outils du vendeur"><Link href="/dashboard/clients">Mes clients</Link><Link href="/dashboard/compte">Mon compte</Link></nav>{children}</div></div></main>}
