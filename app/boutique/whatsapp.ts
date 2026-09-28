import type { Product } from '../data';
import { formatPrice } from '../format';

export function whatsappProductUrl(number:string|null|undefined, product:Product){
 if(!number||!/^[1-9]\d{7,14}$/.test(number))return null;
 const message=`Bonjour, je souhaite commander le produit « ${product.name} » (${formatPrice(product.price,product.currency)}). Est-il disponible ?`;
 return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
