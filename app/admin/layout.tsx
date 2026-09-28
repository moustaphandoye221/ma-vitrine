import Link from 'next/link';
import { requireAdmin } from './access';
import Nav from './nav';
export const dynamic='force-dynamic';
export default async function Layout({children}:{children:React.ReactNode}){await requireAdmin();return <main className="seller-app"><Nav/><div className="seller-main"><header className="seller-topbar"><Link className="seller-brand" href="/"><img className="mavitrine-mark" src="/mavitrine-logo.png" width="36" height="36" alt=""/>mavitrine</Link><div className="seller-topbar-right"><Link href="/dashboard">Espace vendeur</Link><Link className="seller-signout" href="/signout-with-chatgpt?return_to=/">Déconnexion</Link></div></header><div className="seller-content">{children}</div></div></main>}
