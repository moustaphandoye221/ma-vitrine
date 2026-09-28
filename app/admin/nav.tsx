'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard,Store,ClipboardList,CreditCard } from 'lucide-react';
const items=[['/admin','Vue générale',LayoutDashboard],['/admin/boutiques','Boutiques',Store],['/admin/commandes','Commandes',ClipboardList],['/admin/abonnements','Abonnements',CreditCard]] as const;
export default function Nav(){const path=usePathname();return <aside className="seller-sidebar"><div className="seller-sidebar-label">ADMINISTRATION</div><nav aria-label="Administration du SaaS">{items.map(([href,label,Icon])=><Link key={href} href={href} aria-current={path===href||(href!='/admin'&&path.startsWith(href+'/'))?'page':undefined}><Icon size={19}/><span>{label}</span></Link>)}</nav><div className="seller-sidebar-bottom"><Link href="/dashboard">Mon espace vendeur</Link><span>MaVitrine · Administration</span></div></aside>}
