import hashlib
import json
from app.domain.models import Shop, Product, Order, OrderEvent, User
from app.domain.errors import DomainError
from app.domain.ports import UnitOfWork

TRANSITIONS = {'nouvelle': {'confirmée','annulée'}, 'confirmée': {'en préparation','annulée'},
    'en préparation': {'expédiée','annulée'}, 'expédiée': {'terminée'}, 'terminée': set(), 'annulée': set()}

class CommerceService:
    def __init__(self, uow: UnitOfWork): self.uow = uow
    def public_shop(self, slug: str) -> Shop:
        shop = self.uow.repo.one(Shop, slug=slug, active=True)
        if not shop: raise DomainError('Boutique introuvable.', 404)
        return shop
    def owned_shop(self, actor: User) -> Shop:
        shop = self.uow.repo.one(Shop, owner_id=actor.id)
        if not shop: raise DomainError('Créez votre boutique.', 404)
        if not shop.active: raise DomainError('Boutique suspendue.', 403)
        return shop
    def owned_product(self, actor: User, product_id: str) -> Product:
        shop = self.owned_shop(actor)
        product = self.uow.repo.get(Product, product_id)
        if not product or product.shop_id != shop.id or not product.active:
            raise DomainError('Produit introuvable.', 404)
        return product
    def validate_assets(self, actor: User, values: dict) -> None:
        for key in ('image_key','avatar_key','cover_key'):
            value = values.get(key)
            if value and (not value.startswith(actor.id+'/') or '..' in value or value.count('/') != 1):
                raise DomainError('Image non autorisée.', 403)
        gallery = values.get('gallery_keys', [])
        if len(gallery) > 4 or len(gallery) != len(set(gallery)):
            raise DomainError('Maximum 4 photos différentes.', 400)
        for value in gallery:
            if not value.startswith(actor.id+'/') or '..' in value or value.count('/') != 1:
                raise DomainError('Image non autorisée.', 403)
    def save_shop(self, actor: User, values: dict) -> Shop:
        self.validate_assets(actor, values)
        shop = self.uow.repo.one(Shop, owner_id=actor.id)
        if shop and not shop.active: raise DomainError('Boutique suspendue.', 403)
        taken = self.uow.repo.one(Shop, slug=values['slug'])
        if taken and (not shop or taken.id != shop.id): raise DomainError('Lien déjà utilisé.', 409)
        if shop:
            for key, value in values.items(): setattr(shop, key, value)
        else:
            shop = Shop(owner_id=actor.id, **values)
            self.uow.repo.add(shop)
        self.uow.commit()
        return shop
    def create_product(self, actor: User, values: dict) -> Product:
        self.validate_assets(actor, values)
        product = Product(shop_id=self.owned_shop(actor).id, **values)
        self.uow.repo.add(product)
        self.uow.commit()
        return product
    def checkout(self, slug: str, payload: dict, key: str) -> Order:
        shop = self.public_shop(slug)
        fingerprint = hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()
        existing = self.uow.repo.one(Order, shop_id=shop.id, idempotency_key=key)
        if existing:
            if existing.request_hash != fingerprint: raise DomainError('Clé déjà utilisée pour une autre commande.', 409)
            return existing
        quantities: dict[str,int] = {}
        for item in payload['items']:
            quantities[item['id']] = quantities.get(item['id'], 0) + item['quantity']
        lines, total, currency = [], 0, None
        for pid, quantity in quantities.items():
            if quantity > 99: raise DomainError('Quantité maximale dépassée.')
            product = self.uow.repo.get(Product, pid)
            if not product or not product.active or product.shop_id != shop.id:
                raise DomainError('Produit indisponible.')
            if currency and currency != product.currency: raise DomainError('Une seule devise par commande.')
            currency = product.currency
            total += product.price * quantity
            lines.append(dict(id=product.id, name=product.name, price=product.price, quantity=quantity))
        if total > 1_000_000_000: raise DomainError('Montant maximal dépassé.')
        order = Order(shop_id=shop.id, customer_name=payload['name'], customer_email=payload['email'],
            customer_phone=payload['phone'], delivery_address=payload['address'], items=lines,
            total=total, currency=currency, idempotency_key=key, request_hash=fingerprint)
        self.uow.repo.add(order)
        self.uow.repo.add(OrderEvent(shop_id=shop.id, order_id=order.id, status=order.status, payment_status=order.payment_status))
        self.uow.commit()
        return order
    def update_order(self, actor: User, identifier: str, status: str, payment_status: str) -> Order:
        shop = self.owned_shop(actor)
        order = self.uow.repo.get(Order, identifier)
        if not order or order.shop_id != shop.id: raise DomainError('Commande introuvable.', 404)
        if status != order.status and status not in TRANSITIONS[order.status]:
            raise DomainError('Transition de statut non autorisée.', 409)
        if status != order.status or payment_status != order.payment_status:
            order.status, order.payment_status = status, payment_status
            self.uow.repo.add(OrderEvent(shop_id=shop.id, order_id=order.id, status=status, payment_status=payment_status))
            self.uow.commit()
        return order
