import Link from 'next/link';
import { db, type Shop } from '../data';
import { requireAdmin } from './access';

type Activity={currency:string;status:string;payment_status:string;orders:number;total:number};
export default async function Admin(){
  await requireAdmin();
  const counts=await db().prepare('SELECT (SELECT COUNT(*) FROM shops) AS shops,(SELECT COUNT(*) FROM products) AS products,(SELECT COUNT(*) FROM orders) AS orders,(SELECT COUNT(*) FROM subscriptions) AS subscriptions').first<{shops:number;products:number;orders:number;subscriptions:number}>();
  const shops=(await db().prepare('SELECT * FROM shops ORDER BY created_at DESC LIMIT 5').all<Shop>()).results;
  const since=new Date(Date.now()-30*86400000).toISOString();
  const activity=(await db().prepare('SELECT currency,status,payment_status,COUNT(*) AS orders,SUM(total) AS total FROM orders WHERE created_at>=? GROUP BY currency,status,payment_status ORDER BY orders DESC').bind(since).all<Activity>()).results;
  return <><div className="seller-heading"><div><span className="seller-eyebrow">PILOTAGE DU SAAS</span><h1>Vue générale</h1><p>Suivez les boutiques et leur activité.</p></div><Link className="seller-outline" href="/boutiques">Voir le site public</Link></div>
    <div className="admin-metrics">{[['Boutiques',counts?.shops||0,'/admin/boutiques'],['Produits',counts?.products||0,'/admin/boutiques'],['Commandes',counts?.orders||0,'/admin/commandes'],['Offres suivies',counts?.subscriptions||0,'/admin/abonnements']].map(([label,value,href])=><Link key={label} className="admin-metric" href={String(href)}><span>{label}</span><strong>{value}</strong><small>Consulter →</small></Link>)}</div>
    <div className="seller-section-head"><h2>Activité des 30 derniers jours</h2><Link href="/admin/commandes">Toutes les commandes</Link></div>
    <div className="admin-shop-list">{activity.map(row=><div className="admin-shop-row" key={row.currency+row.status+row.payment_status}><div><strong>{row.orders} commande(s) · {row.status}</strong><p>Règlement déclaré : {row.payment_status}</p></div><span>{new Intl.NumberFormat('fr-FR',{style:'currency',currency:row.currency}).format(row.total/100)}</span></div>)}{!activity.length&&<div className="seller-empty">Aucune commande sur cette période.</div>}</div>
    <p className="muted">Totaux de commandes déclarées par les vendeurs, sans preuve d’encaissement par la plateforme.</p>
    <div className="seller-section-head"><h2>Dernières boutiques</h2><Link href="/admin/boutiques">Toutes les boutiques</Link></div>
    <div className="admin-shop-list">{shops.map(s=><Link className="admin-shop-row" key={s.id} href={'/admin/boutiques/'+s.id}><div><strong>{s.name}</strong><p>/boutique/{s.slug}</p></div><span>Gérer →</span></Link>)}{!shops.length&&<div className="seller-empty">Aucune boutique créée pour le moment.</div>}</div>
  </>;
}
