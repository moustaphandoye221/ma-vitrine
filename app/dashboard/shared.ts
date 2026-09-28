import { requireChatGPTUser } from '../chatgpt-auth';
import { ownedShop, shopProducts, db, type Shop, type Product } from '../data';
export type Order={id:string;shop_id:string;customer_name:string;customer_email:string;customer_phone:string;delivery_address:string;items_json:string;total:number;currency:string;status:string;payment_status:string;created_at:string};
export async function sellerData(returnTo='/dashboard'):Promise<{ user:Awaited<ReturnType<typeof requireChatGPTUser>>;shop:Shop|null;products:Product[];orders:Order[] }>{
 const user=await requireChatGPTUser(returnTo);const shop=await ownedShop(user.userId);const products=shop?await shopProducts(shop.id):[];const orders=shop?(await db().prepare('SELECT * FROM orders WHERE shop_id=? ORDER BY created_at DESC').bind(shop.id).all<Order>()).results:[];return {user,shop,products,orders};
}
export function orderLines(order:Order):{id:string;name:string;price:number;quantity:number}[]{try{return JSON.parse(order.items_json)}catch{return []}}
