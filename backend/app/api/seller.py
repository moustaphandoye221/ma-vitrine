from fastapi import APIRouter, Response
from sqlalchemy import func, select
from app.api.dependencies import Actor, Uow, Commerce
from app.api.catalog import Offset, Limit
from app.api.schemas import ShopInput, ShopView, ProductInput, ProductView, OrderUpdate, OrderView
from app.domain.models import Product, Order
from app.domain.errors import DomainError

router = APIRouter(prefix='/seller', tags=['Espace vendeur'])
@router.get('/shop', response_model=ShopView)
def shop(actor: Actor, service: Commerce): return service.owned_shop(actor)
@router.put('/shop', response_model=ShopView)
def save_shop(data: ShopInput, actor: Actor, service: Commerce): return service.save_shop(actor, data.model_dump())
@router.get('/products', response_model=list[ProductView])
def products(actor: Actor, service: Commerce, uow: Uow, offset: Offset=0, limit: Limit=50):
    return uow.repo.list(Product, offset, limit, shop_id=service.owned_shop(actor).id, active=True)
@router.post('/products', response_model=ProductView, status_code=201)
def create_product(data: ProductInput, actor: Actor, service: Commerce): return service.create_product(actor, data.model_dump())
@router.put('/products/{identifier}', response_model=ProductView)
def update_product(identifier: str, data: ProductInput, actor: Actor, service: Commerce, uow: Uow):
    product = service.owned_product(actor, identifier)
    service.validate_assets(actor, data.model_dump())
    for key,value in data.model_dump().items(): setattr(product,key,value)
    uow.commit()
    return product
@router.delete('/products/{identifier}', status_code=204)
def delete_product(identifier: str, actor: Actor, service: Commerce, uow: Uow):
    service.owned_product(actor, identifier).active = False
    uow.commit()
    return Response(status_code=204)
@router.get('/orders', response_model=list[OrderView])
def orders(actor: Actor, service: Commerce, uow: Uow, offset: Offset=0, limit: Limit=50):
    return uow.repo.list(Order, offset, limit, shop_id=service.owned_shop(actor).id)
@router.get('/orders/{identifier}', response_model=OrderView)
def order(identifier: str, actor: Actor, service: Commerce, uow: Uow):
    order = uow.repo.get(Order, identifier)
    if not order or order.shop_id != service.owned_shop(actor).id: raise DomainError('Commande introuvable.',404)
    return order
@router.patch('/orders/{identifier}', response_model=OrderView)
def update_order(identifier: str, data: OrderUpdate, actor: Actor, service: Commerce):
    return service.update_order(actor,identifier,data.status,data.payment_status)
@router.get('/metrics')
def metrics(actor: Actor, service: Commerce, uow: Uow):
    shop = service.owned_shop(actor)
    def count(model,*conditions):
        return uow.session.scalar(select(func.count()).select_from(model).where(model.shop_id==shop.id,*conditions))
    return {'products':count(Product,Product.active.is_(True)), 'orders':count(Order),
        'new_orders':count(Order,Order.status=='nouvelle'), 'paid_orders':count(Order,Order.payment_status=='payé')}
@router.get('/clients')
def clients(actor: Actor, service: Commerce, uow: Uow, offset: Offset=0, limit: Limit=50):
    shop = service.owned_shop(actor)
    query=select(Order.customer_email,func.count().label('orders'),func.max(Order.created_at).label('last_order')).where(Order.shop_id==shop.id).group_by(Order.customer_email).order_by(func.max(Order.created_at).desc()).offset(offset).limit(limit)
    return [dict(row) for row in uow.session.execute(query).mappings()]
