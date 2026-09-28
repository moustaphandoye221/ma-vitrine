from sqlalchemy import (Boolean, CheckConstraint, Column, DateTime, ForeignKey,
    Integer, JSON, MetaData, String, Table, UniqueConstraint, create_engine, event, select)
from sqlalchemy.orm import Session, registry
from app.domain.models import User, Shop, Product, Order, OrderEvent, Subscription

mapper = registry(metadata=MetaData())
metadata = mapper.metadata

def common():
    return [Column('id', String(36), primary_key=True), Column('created_at', DateTime(timezone=True), nullable=False)]

users = Table('users', metadata, *common(), Column('email', String(254), unique=True, nullable=False),
    Column('password_hash', String(255), nullable=False), Column('name', String(100), nullable=False),
    Column('role', String(20), nullable=False), Column('active', Boolean, nullable=False),
    CheckConstraint("role IN ('seller','admin')"))
shops = Table('shops', metadata, *common(), Column('owner_id', ForeignKey('users.id'), unique=True, nullable=False),
    Column('slug', String(40), unique=True, nullable=False), Column('name', String(80), nullable=False),
    Column('description', String(500), nullable=False), Column('accent_color', String(7), nullable=False),
    Column('payment_instructions', String(500), nullable=False), Column('meta_pixel_id', String(30)),
    Column('whatsapp_number', String(15)), Column('avatar_key', String(100)),
    Column('cover_key', String(100)), Column('cover_position', Integer, nullable=False, server_default='50'),
    Column('cover_blur', Integer, nullable=False, server_default='2'), Column('cover_shade', Integer, nullable=False, server_default='55'),
    Column('surface_theme', String(20), nullable=False, server_default='blanc'),
    Column('hero_align', String(20), nullable=False, server_default='gauche'),
    Column('hero_height', String(20), nullable=False, server_default='standard'),
    Column('card_style', String(20), nullable=False, server_default='doux'),
    Column('catalog_columns', Integer, nullable=False, server_default='3'), Column('active', Boolean, nullable=False))
products = Table('products', metadata, *common(), Column('shop_id', ForeignKey('shops.id'), nullable=False, index=True),
    Column('name', String(100), nullable=False), Column('description', String(1000), nullable=False),
    Column('price', Integer, nullable=False), Column('currency', String(3), nullable=False),
    Column('image_key', String(100)), Column('gallery_keys', JSON, nullable=False, server_default='[]'),
    Column('active', Boolean, nullable=False), CheckConstraint('price > 0'),
    CheckConstraint("currency IN ('XOF','EUR','USD')"))
orders = Table('orders', metadata, *common(), Column('shop_id', ForeignKey('shops.id'), nullable=False, index=True),
    Column('customer_name', String(100), nullable=False), Column('customer_email', String(254), nullable=False),
    Column('customer_phone', String(40), nullable=False), Column('delivery_address', String(500), nullable=False),
    Column('items', JSON, nullable=False), Column('total', Integer, nullable=False), Column('currency', String(3), nullable=False),
    Column('status', String(30), nullable=False), Column('payment_status', String(20), nullable=False),
    Column('idempotency_key', String(100), nullable=False), Column('request_hash', String(64), nullable=False),
    UniqueConstraint('shop_id', 'idempotency_key'), CheckConstraint('total > 0'))
order_events = Table('order_events', metadata, *common(),
    Column('shop_id', ForeignKey('shops.id'), nullable=False),
    Column('order_id', ForeignKey('orders.id'), nullable=False, index=True),
    Column('status', String(30), nullable=False),
    Column('payment_status', String(20), nullable=False))
subscriptions = Table('subscriptions', metadata, *common(),
    Column('shop_id', ForeignKey('shops.id'), unique=True, nullable=False),
    Column('plan', String(20), nullable=False), Column('billing_cycle', String(20), nullable=False),
    Column('status', String(20), nullable=False), Column('expires_at', DateTime(timezone=True)),
    Column('note', String(500), nullable=False),
    CheckConstraint("plan IN ('decouverte','boutique','studio')"),
    CheckConstraint("billing_cycle IN ('none','monthly','annual')"),
    CheckConstraint("status IN ('active','trial','past_due','canceled')"))
for model, table in [(User, users), (Shop, shops), (Product, products), (Order, orders), (OrderEvent, order_events), (Subscription, subscriptions)]:
    mapper.map_imperatively(model, table)

def make_engine(url: str):
    engine = create_engine(url, connect_args={'check_same_thread': False} if url.startswith('sqlite') else {}, pool_pre_ping=True)
    if url.startswith('sqlite'):
        @event.listens_for(engine, 'connect')
        def enable_foreign_keys(connection, _):
            connection.execute('PRAGMA foreign_keys=ON')
    return engine

class SqlRepository:
    def __init__(self, session: Session): self.session = session
    def get(self, model, identifier): return self.session.get(model, identifier)
    def one(self, model, **filters): return self.session.scalar(select(model).filter_by(**filters))
    def list(self, model, offset=0, limit=50, **filters):
        return list(self.session.scalars(select(model).filter_by(**filters).order_by(model.created_at.desc(), model.id).offset(offset).limit(limit)))
    def add(self, entity): self.session.add(entity)
    def delete(self, entity): self.session.delete(entity)

class SqlUnitOfWork:
    def __init__(self, session: Session):
        self.session = session
        self.repo = SqlRepository(session)
    def commit(self): self.session.commit()
    def rollback(self): self.session.rollback()
