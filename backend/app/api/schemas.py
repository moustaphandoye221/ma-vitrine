from datetime import datetime
from typing import Annotated, Literal
from pydantic import BaseModel, ConfigDict, EmailStr, Field, StringConstraints

ShortName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
class Input(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
class Output(BaseModel):
    model_config = ConfigDict(from_attributes=True)
class Register(Input):
    email: EmailStr
    password: str = Field(min_length=12, max_length=128)
    name: ShortName
class Login(Input):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)
class UserView(Output):
    id: str
    email: str
    name: str
    role: str
class ShopInput(Input):
    name: str = Field(min_length=1, max_length=80)
    slug: str = Field(min_length=1, max_length=40, pattern=r'^[a-z0-9]+(?:-[a-z0-9]+)*$')
    description: str = Field(default='', max_length=500)
    accent_color: str = Field(default='#176b7a', pattern=r'^#[0-9a-fA-F]{6}$')
    payment_instructions: str = Field(default='Paiement à la livraison', min_length=1, max_length=500)
    meta_pixel_id: str | None = Field(default=None, pattern=r'^\d{8,30}$')
    whatsapp_number: str | None = Field(default=None, pattern=r'^[1-9]\d{7,14}$')
    cover_position: int = Field(default=50, ge=0, le=100)
    cover_blur: int = Field(default=2, ge=0, le=12)
    cover_shade: int = Field(default=55, ge=40, le=80)
    surface_theme: Literal['blanc','brume','glacier'] = 'blanc'
    hero_align: Literal['gauche','centre'] = 'gauche'
    hero_height: Literal['compact','standard','grand'] = 'standard'
    card_style: Literal['doux','angle'] = 'doux'
    catalog_columns: Literal[2,3,4] = 3
    avatar_key: str | None = Field(default=None, max_length=100)
    cover_key: str | None = Field(default=None, max_length=100)
class ShopView(ShopInput, Output):
    id: str
    active: bool
class ProductInput(Input):
    name: ShortName
    description: str = Field(default='', max_length=1000)
    price: int = Field(gt=0, le=10_000_000_000, strict=True, description='Montant en centièmes de devise, compatible avec le frontend existant')
    currency: Literal['XOF','EUR','USD'] = 'XOF'
    image_key: str | None = Field(default=None, max_length=100)
    gallery_keys: list[str] = Field(default_factory=list, max_length=4)
class ProductView(ProductInput, Output):
    id: str
    shop_id: str
    active: bool
class OrderItem(Input):
    id: str = Field(min_length=1, max_length=36)
    quantity: int = Field(ge=1, le=99, strict=True)
class Checkout(Input):
    name: ShortName
    email: EmailStr
    phone: str = Field(min_length=3, max_length=40)
    address: str = Field(min_length=3, max_length=500)
    items: list[OrderItem] = Field(min_length=1, max_length=50)
class OrderUpdate(Input):
    status: Literal['nouvelle','confirmée','en préparation','expédiée','terminée','annulée']
    payment_status: Literal['non payé','payé']
class OrderView(Output):
    id: str
    shop_id: str
    customer_name: str
    customer_email: str
    customer_phone: str
    delivery_address: str
    items: list[dict]
    total: int
    currency: str
    status: str
    payment_status: str
    created_at: datetime
class Receipt(Output):
    id: str
    total: int
    currency: str
    status: str
class OrderEventView(Output):
    id: str
    order_id: str
    status: str
    payment_status: str
    created_at: datetime
class Moderation(Input):
    active: bool
class SubscriptionUpdate(Input):
    plan: Literal['decouverte','boutique','studio']
    billing_cycle: Literal['none','monthly','annual']
    status: Literal['active','trial','past_due','canceled']
    expires_at: datetime | None = None
    note: str = Field(default='', max_length=500)
class SubscriptionView(SubscriptionUpdate, Output):
    id: str
    shop_id: str
    created_at: datetime
