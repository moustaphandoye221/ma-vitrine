export function imageUrl(key:string|null) { return key ? '/images/'+key.split('/').map(encodeURIComponent).join('/') : null; }
export function formatPrice(price:number,currency:string) { return new Intl.NumberFormat('fr-FR',{style:'currency',currency,maximumFractionDigits:currency==='XOF'?0:2}).format(price/100); }
