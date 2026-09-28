'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Package, ClipboardList, Store, ExternalLink } from 'lucide-react';
const items=[{href:'/dashboard',label:'Vue d’ensemble',Icon:LayoutDashboard},{href:'/dashboard/produits',label:'Produits',Icon:Package},{href:'/dashboard/commandes',label:'Commandes',Icon:ClipboardList},{href:'/dashboard/boutique',label:'Ma boutique',Icon:Store}];
export default function DashboardNav({slug}:{slug:string|null}){const path=usePathname();return <aside className="seller-sidebar"><div className="seller-sidebar-label">MENU PRINCIPAL</div><nav aria-label="Espace vendeur">{items.map(({href,label,Icon})=><Link key={href} href={href} aria-current={path===href||href!=='/dashboard'&&path.startsWith(href+'/')?'page':undefined}><Icon size={19}/><span>{label}</span></Link>)}</nav><div className="seller-sidebar-bottom">{slug&&<Link href={'/boutique/'+slug} target="_blank" rel="noopener noreferrer"><ExternalLink size={18}/> Voir ma boutique</Link>}<span>Ma Vitrine · Espace vendeur</span></div></aside>}
