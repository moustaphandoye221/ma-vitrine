'use client';
import Link from 'next/link';
import { Menu } from 'lucide-react';
import { Sheet, SheetTrigger, SheetContent, SheetTitle, SheetDescription, SheetClose } from '@/components/ui/sheet';
export default function MobileMenu({dashboard}:{dashboard:string}) {
  return <div className="mobile-menu"><Sheet><SheetTrigger asChild><button type="button" className="mobile-menu-trigger" aria-label="Ouvrir le menu"><Menu size={23}/></button></SheetTrigger><SheetContent className="mobile-menu-panel"><SheetTitle>MaVitrine</SheetTitle><SheetDescription>Votre boutique, votre univers.</SheetDescription><nav aria-label="Navigation mobile">{[['Découvrir les boutiques','/boutiques'],['Fonctionnalités','/#fonctionnalites'],['Tarifs','/#tarifs'],['Questions fréquentes','/#questions'],['Mon espace vendeur',dashboard]].map(([label,href])=><SheetClose asChild key={label}><Link href={href}>{label}</Link></SheetClose>)}</nav><SheetClose asChild><Link className="landing-primary" href={dashboard}>Créer ma boutique</Link></SheetClose></SheetContent></Sheet></div>;
}
