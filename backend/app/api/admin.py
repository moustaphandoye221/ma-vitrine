from datetime import datetime, timedelta, timezone
from fastapi import APIRouter
from sqlalchemy import func, select
from app.api.dependencies import Admin, Uow
from app.api.catalog import Offset, Limit
from app.api.schemas import ShopView, Moderation, SubscriptionUpdate, SubscriptionView
from app.domain.models import Shop, Product, Order, User, Subscription
from app.domain.errors import DomainError

router = APIRouter(prefix='/admin', tags=['Administration'])
@router.get('/metrics')
def metrics(actor: Admin, uow: Uow):
    counts={key:uow.session.scalar(select(func.count()).select_from(model)) for key,model in [('shops',Shop),('products',Product),('orders',Order),('users',User)]}
    counts['active_shops']=uow.session.scalar(select(func.count()).select_from(Shop).where(Shop.active.is_(True)))
    counts['subscriptions']=uow.session.scalar(select(func.count()).select_from(Subscription))
    return counts
@router.get('/analytics')
def analytics(actor: Admin, uow: Uow):
    """Order activity and recorded amounts; no payment processor revenue is inferred."""
    since=datetime.now(timezone.utc)-timedelta(days=30)
    order_rows=uow.session.execute(select(Order.currency, Order.status, Order.payment_status,
        func.count(Order.id), func.sum(Order.total)).where(Order.created_at>=since)
        .group_by(Order.currency, Order.status, Order.payment_status)).all()
    subscriptions_by_plan=uow.session.execute(select(Subscription.plan,Subscription.status,func.count(Subscription.id))
        .group_by(Subscription.plan,Subscription.status)).all()
    return {'period_days':30,'orders':[{'currency':currency,'status':status,'payment_status':payment,
        'count':count,'order_total':total} for currency,status,payment,count,total in order_rows],
        'subscriptions':[{'plan':plan,'status':status,'count':count} for plan,status,count in subscriptions_by_plan]}
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
@router.get('/subscriptions', response_model=list[SubscriptionView])
def subscriptions(actor: Admin, uow: Uow, offset: Offset=0, limit: Limit=50):
    return uow.repo.list(Subscription,offset,limit)
@router.get('/shops/{identifier}/subscription', response_model=SubscriptionView|None)
def shop_subscription(identifier: str, actor: Admin, uow: Uow):
    if not uow.repo.get(Shop,identifier): raise DomainError('Boutique introuvable.',404)
    return uow.repo.one(Subscription,shop_id=identifier)
@router.put('/shops/{identifier}/subscription', response_model=SubscriptionView)
def update_subscription(identifier: str, data: SubscriptionUpdate, actor: Admin, uow: Uow):
    if not uow.repo.get(Shop,identifier): raise DomainError('Boutique introuvable.',404)
    values=data.model_dump()
    if values['expires_at'] is not None and values['expires_at'].tzinfo is None:
        raise DomainError('Date d’expiration avec fuseau horaire requise.',422)
    if values['plan']=='decouverte' and values['billing_cycle']!='none':
        raise DomainError('Le plan gratuit ne peut pas avoir de cycle facturé.',422)
    if values['plan']!='decouverte' and values['billing_cycle']=='none':
        raise DomainError('Choisissez un cycle pour cette offre.',422)
    subscription=uow.repo.one(Subscription,shop_id=identifier)
    if subscription:
        for key,value in values.items(): setattr(subscription,key,value)
    else:
        subscription=Subscription(shop_id=identifier,**values)
        uow.repo.add(subscription)
    uow.commit()
    return subscription
