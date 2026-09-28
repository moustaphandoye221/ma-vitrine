import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
export const shops = sqliteTable('shops', {
 id: text('id').primaryKey(), ownerId: text('owner_id').notNull().unique(), slug: text('slug').notNull().unique(), name: text('name').notNull(), description: text('description').notNull().default(''), avatarKey: text('avatar_key'), coverKey: text('cover_key'), paymentInstructions: text('payment_instructions').notNull().default('Paiement à la livraison'), metaPixelId:text('meta_pixel_id'), whatsappNumber:text('whatsapp_number'), accentColor: text('accent_color').notNull().default('#176b7a'), coverPosition: integer('cover_position').notNull().default(50), coverBlur: integer('cover_blur').notNull().default(2), coverShade: integer('cover_shade').notNull().default(55), surfaceTheme:text('surface_theme').notNull().default('blanc'), heroAlign:text('hero_align').notNull().default('gauche'), heroHeight:text('hero_height').notNull().default('standard'), cardStyle:text('card_style').notNull().default('doux'), catalogColumns:integer('catalog_columns').notNull().default(3), createdAt: text('created_at').notNull()
});
export const products = sqliteTable('products', {
 id: text('id').primaryKey(), shopId: text('shop_id').notNull().references(()=>shops.id), name: text('name').notNull(), description: text('description').notNull().default(''), price: integer('price').notNull(), currency: text('currency').notNull().default('XOF'), imageKey: text('image_key'), paymentUrl: text('payment_url'), createdAt: text('created_at').notNull()
});
export const productImages = sqliteTable('product_images', {
 id:text('id').primaryKey(), productId:text('product_id').notNull().references(()=>products.id), shopId:text('shop_id').notNull().references(()=>shops.id), imageKey:text('image_key').notNull(), position:integer('position').notNull().default(0)
},table=>[index('idx_product_images_product_position').on(table.productId,table.position)]);
export const orders = sqliteTable('orders', {
 id:text('id').primaryKey(), shopId:text('shop_id').notNull().references(()=>shops.id), customerName:text('customer_name').notNull(), customerEmail:text('customer_email').notNull(), customerPhone:text('customer_phone').notNull(), deliveryAddress:text('delivery_address').notNull(), itemsJson:text('items_json').notNull(), total:integer('total').notNull(), currency:text('currency').notNull(), status:text('status').notNull().default('nouvelle'), paymentStatus:text('payment_status').notNull().default('non payé'), createdAt:text('created_at').notNull(), requestKey:text('request_key').unique(), requestFingerprint:text('request_fingerprint')
});
export const orderEvents = sqliteTable('order_events', {
 id:text('id').primaryKey(), orderId:text('order_id').notNull().references(()=>orders.id), shopId:text('shop_id').notNull().references(()=>shops.id), status:text('status').notNull(), paymentStatus:text('payment_status').notNull(), createdAt:text('created_at').notNull()
});
export const subscriptions = sqliteTable('subscriptions', {
 id:text('id').primaryKey(), shopId:text('shop_id').notNull().unique().references(()=>shops.id),
 plan:text('plan').notNull().default('decouverte'), billingCycle:text('billing_cycle').notNull().default('none'),
 status:text('status').notNull().default('active'), expiresAt:text('expires_at'), note:text('note').notNull().default(''),
 createdAt:text('created_at').notNull(), updatedAt:text('updated_at').notNull()
});
