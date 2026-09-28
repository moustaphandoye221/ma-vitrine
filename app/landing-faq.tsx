'use client';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
const questions=[
  {q:'Comment créer ma boutique ?',a:'Connectez-vous, choisissez le nom et le lien de votre boutique, puis ajoutez votre photo, votre couverture et vos premiers produits.'},
  {q:'Mes clients peuvent-ils commander sans compte ?',a:'Oui. Ils ajoutent les articles au panier et indiquent leurs coordonnées pour confirmer leur commande.'},
  {q:'Comment se passe le paiement ?',a:'La commande est enregistrée dans votre tableau de bord. Vous indiquez vos modalités de règlement et marquez le paiement comme reçu après l’avoir vérifié. Aucun paiement en ligne n’est prélevé par Ma Vitrine actuellement.'},
  {q:'Puis-je changer l’apparence de ma boutique ?',a:'Oui. Modifiez le nom, la description, la photo de profil, la couverture et la couleur d’accent depuis votre tableau de bord.'},
  {q:'Puis-je partager un lien direct vers ma boutique ?',a:'Oui. Chaque boutique possède une adresse personnelle de la forme /boutique/votre-nom, que vous pouvez partager avec vos clients.'},
];
export default function LandingFaq(){return <Accordion type="single" collapsible className="landing-faq-list">{questions.map((item,i)=><AccordionItem value={'item-'+i} key={item.q}><AccordionTrigger className="landing-faq-question">{item.q}</AccordionTrigger><AccordionContent className="landing-faq-answer">{item.a}</AccordionContent></AccordionItem>)}</Accordion>}
