from typing import Annotated
from fastapi import APIRouter, Header, Query
from app.api.dependencies import Uow, Commerce
from app.api.schemas import ShopView, ProductView, Checkout, Receipt
from app.domain.models import Shop, Product
from app.domain.errors import DomainError

router = APIRouter(prefix='/shops', tags=['Catalogue public'])
Offset = Annotated[int, Query(ge=0)]
Limit = Annotated[int, Query(ge=1, le=100)]
@router.get('', response_model=list[ShopView])
def shops(uow: Uow, offset: Offset=0, limit: Limit=50):
    return uow.repo.list(Shop, offset, limit, active=True)
@router.get('/{slug}', response_model=ShopView)
def shop(slug: str, service: Commerce): return service.public_shop(slug)
@router.get('/{slug}/products', response_model=list[ProductView])
def products(slug: str, service: Commerce, uow: Uow, offset: Offset=0, limit: Limit=50):
    return uow.repo.list(Product, offset, limit, shop_id=service.public_shop(slug).id, active=True)
@router.get('/{slug}/products/{identifier}', response_model=ProductView)
def product(slug: str, identifier: str, service: Commerce, uow: Uow):
    shop = service.public_shop(slug)
    product = uow.repo.get(Product, identifier)
    if not product or product.shop_id != shop.id or not product.active: raise DomainError('Produit introuvable.',404)
    return product
@router.post('/{slug}/orders', response_model=Receipt, status_code=201)
def checkout(slug: str, data: Checkout, service: Commerce,
    idempotency_key: Annotated[str, Header(min_length=16,max_length=100)]):
    return service.checkout(slug, data.model_dump(mode='json'), idempotency_key)
