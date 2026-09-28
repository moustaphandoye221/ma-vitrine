from dataclasses import dataclass, field
from datetime import datetime, timezone
from uuid import uuid4

def identifier() -> str:
    return str(uuid4())

def now() -> datetime:
    return datetime.now(timezone.utc)

@dataclass
class User:
    email: str
    password_hash: str
    name: str
    id: str = field(default_factory=identifier)
    role: str = 'seller'
    active: bool = True
    created_at: datetime = field(default_factory=now)

@dataclass
class Shop:
    owner_id: str
    slug: str
    name: str
    description: str = ''
    accent_color: str = '#176b7a'
    cover_position: int = 50
    cover_blur: int = 2
    cover_shade: int = 55
    payment_instructions: str = 'Paiement à la livraison'
    avatar_key: str | None = None
    cover_key: str | None = None
    id: str = field(default_factory=identifier)
    active: bool = True
    created_at: datetime = field(default_factory=now)

@dataclass
class Product:
    shop_id: str
    name: str
    price: int
    currency: str = 'XOF'
    description: str = ''
    image_key: str | None = None
    id: str = field(default_factory=identifier)
    active: bool = True
    created_at: datetime = field(default_factory=now)

@dataclass
class Order:
    shop_id: str
    customer_name: str
    customer_email: str
    customer_phone: str
    delivery_address: str
    items: list[dict]
    total: int
    currency: str
    idempotency_key: str
    request_hash: str
    id: str = field(default_factory=identifier)
    status: str = 'nouvelle'
    payment_status: str = 'non payé'
    created_at: datetime = field(default_factory=now)
