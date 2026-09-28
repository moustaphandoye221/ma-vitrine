import Link from 'next/link';
import { db } from '../../data';
import { requireAdmin } from '../access';

type Row={id:string;name:string;slug:string;plan:string|null;billing_cycle:string|null;status:string|null;expires_at:string|null};
const label:Record<string,string>={decouverte:'Découverte',boutique:'Boutique',studio:'Studio',active:'Actif',trial:'Essai',past_due:'En attente',canceled:'Résilié'};
export default async function Billing({searchParams}:{searchParams:Promise<{q?:string}>}){
  await requireAdmin();
  const q=(await searchParams).q?.trim().slice(0,80)||'';
  const rows=(await db().prepare('SELECT s.id,s.name,s.slug,a.plan,a.billing_cycle,a.status,a.expires_at FROM shops s LEFT JOIN subscriptions a ON a.shop_id=s.id WHERE instr(lower(s.name),lower(?))>0 OR instr(lower(s.slug),lower(?))>0 ORDER BY s.created_at DESC LIMIT 200').bind(q,q).all<Row>()).results;
  const recorded=await db().prepare('SELECT COUNT(*) AS total FROM subscriptions').first<{total:number}>();
  return <><div className="seller-heading"><div><span className="seller-eyebrow">OFFRES DE LA PLATEFORME</span><h1>Abonnements</h1><p>Consultez et attribuez manuellement une offre à chaque boutique.</p></div></div>
    <div className="admin-metrics"><div className="admin-metric"><span>Abonnements renseignés</span><strong>{recorded?.total||0}</strong><small>Gestion manuelle</small></div><div className="admin-metric"><span>Boutiques affichées</span><strong>{rows.length}</strong><small>200 résultats au maximum</small></div></div>
    <p className="muted">Aucun prélèvement ni renouvellement automatique n’est activé. Les tarifs publics sont indicatifs ; les dates de fin et les statuts sont informatifs.</p>
    <form className="admin-filters" method="get"><label htmlFor="subscription-search">Rechercher une boutique<input id="subscription-search" name="q" defaultValue={q} placeholder="Nom ou lien" maxLength={80}/></label><button className="seller-solid">Rechercher</button>{q&&<Link className="seller-outline" href="/admin/abonnements">Effacer</Link>}</form>
    <div className="admin-shop-list">{rows.map(row=><article className="admin-shop-row" key={row.id}><div><strong>{row.name}</strong><p>/boutique/{row.slug} · {label[row.plan||'decouverte']} · {label[row.status||'active']}</p><small>{row.billing_cycle==='monthly'?'Mensuel':row.billing_cycle==='annual'?'Annuel':'Sans cycle'}{row.expires_at?' · Fin prévue : '+new Date(row.expires_at).toLocaleDateString('fr-FR'):''}</small></div><Link className="seller-outline" href={'/admin/boutiques/'+row.id}>Gérer l’offre</Link></article>)}{!rows.length&&<div className="seller-empty">Aucune boutique trouvée.</div>}</div>
  </>;
}
