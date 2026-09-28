from fastapi import APIRouter
from sqlalchemy import func, select
from app.api.dependencies import Admin, Uow
from app.api.catalog import Offset, Limit
from app.api.schemas import ShopView, Moderation
from app.domain.models import Shop, Product, Order, User
from app.domain.errors import DomainError

router = APIRouter(prefix='/admin', tags=['Administration'])
@router.get('/metrics')
def metrics(actor: Admin, uow: Uow):
    return {key:uow.session.scalar(select(func.count()).select_from(model)) for key,model in [('shops',Shop),('products',Product),('orders',Order),('users',User)]}
@router.get('/shops', response_model=list[ShopView])
def shops(actor: Admin, uow: Uow, offset: Offset=0, limit: Limit=50): return uow.repo.list(Shop,offset,limit)
@router.patch('/shops/{identifier}', response_model=ShopView)
def moderate(identifier: str, data: Moderation, actor: Admin, uow: Uow):
    shop = uow.repo.get(Shop,identifier)
    if not shop: raise DomainError('Boutique introuvable.',404)
    shop.active = data.active
    uow.commit()
    return shop
@router.get('/orders')
def orders(actor: Admin, uow: Uow, offset: Offset=0, limit: Limit=50):
    # Platform overview deliberately excludes buyer contact information.
    return [dict(id=o.id,shop_id=o.shop_id,total=o.total,currency=o.currency,status=o.status,payment_status=o.payment_status) for o in uow.repo.list(Order,offset,limit)]
